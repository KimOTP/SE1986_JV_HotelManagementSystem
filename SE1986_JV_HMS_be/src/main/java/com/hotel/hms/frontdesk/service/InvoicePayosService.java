package com.hotel.hms.frontdesk.service;

import com.hotel.hms.frontdesk.dto.InvoiceResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;

// Invoice settlement by payOS bank transfer (cash is not accepted). Mirrors BookingPayosService.
@Service
public class InvoicePayosService {

    private static final String REQUESTS = "/v2/payment-requests";
    private static final long INVOICE_ORDER_BASE = 2_000_000_000_000L;
    private static final long REPLACEMENT_STEP = 1_000_000_000_000L;
    private final InvoiceService invoices;
    private final RestClient client;

    @Value("${BOOKING_PAYOS_ENABLED:false}")
    private boolean enabled;
    @Value("${BOOKING_PAYOS_CLIENT_ID:}")
    private String clientId;
    @Value("${BOOKING_PAYOS_API_KEY:}")
    private String apiKey;
    @Value("${BOOKING_PAYOS_CHECKSUM_KEY:}")
    private String checksumKey;
    @Value("${BOOKING_PAYOS_FRONTEND_URL:}")
    private String frontendUrl;
    @Value("${BOOKING_PAYOS_ORDER_OFFSET:0}")
    private long orderOffset;
    @Value("${BOOKING_PAYOS_RECEIVER_BIN:}")
    private String receiverBin;
    @Value("${BOOKING_PAYOS_RECEIVER_ACCOUNT:}")
    private String receiverAccount;
    @Value("${BOOKING_PAYOS_RECEIVER_NAME:}")
    private String receiverName;

    public InvoicePayosService(InvoiceService invoices) {
        this.invoices = invoices;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.client = RestClient.builder().baseUrl("https://api-merchant.payos.vn")
                .requestFactory(factory).build();
    }

    public Checkout createCheckout(String number, ActorService.Actor actor) {
        requireConfigured();
        long amount = amount(invoices.payableDue(number, actor));
        long order = orderCode(invoices.invoiceId(number, actor));
        return createOrResume(number, order, amount, true);
    }

    private Checkout createOrResume(String number, long order, long amount, boolean allowReplacement) {
        String returnUrl = returnUrl(number);
        String description = "HD " + order;
        long expiry = Instant.now().plus(Duration.ofMinutes(30)).getEpochSecond();
        String signature = sign("amount=" + amount + "&cancelUrl=" + returnUrl
                + "&description=" + description + "&orderCode=" + order + "&returnUrl=" + returnUrl);

        JsonNode response;
        try {
            response = client.post().uri(REQUESTS)
                    .header("x-client-id", clientId).header("x-api-key", apiKey)
                    .body(Map.of("orderCode", order, "amount", amount, "description", description,
                            "cancelUrl", returnUrl, "returnUrl", returnUrl, "expiredAt", expiry,
                            "signature", signature))
                    .retrieve().body(JsonNode.class);
        } catch (RestClientException exception) {
            // A retry may follow a request that reached payOS before the connection failed.
            response = null;
        }
        boolean created = response != null && "00".equals(response.path("code").asString());
        JsonNode link = created ? response.path("data") : fetchLink(Long.toString(order));
        if (link.path("orderCode").asLong(-1) != order) throw providerError();
        String linkId = link.path(created ? "paymentLinkId" : "id").asString();
        if (!linkId.matches("[0-9a-fA-F]{32}")) throw providerError();
        String status = link.path("status").asString();
        long linkAmount = link.path("amount").asLong(-1);

        if (!created && allowReplacement && link.path("amountPaid").asLong(-1) == 0) {
            boolean stale = "CANCELLED".equals(status) || "EXPIRED".equals(status);
            boolean amountChanged = "PENDING".equals(status) && linkAmount != amount;
            if (amountChanged) cancelLink(order, linkAmount);
            if (stale || amountChanged) {
                return createOrResume(number, Math.addExact(order, REPLACEMENT_STEP), amount, false);
            }
        }
        if (linkAmount != amount) throw providerError();
        if (!"PENDING".equals(status)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Link thanh toán không còn chờ. Vui lòng kiểm tra trạng thái giao dịch.");
        }
        String account = link.path("accountNumber").asString();
        if (!receiverBin.equals(link.path("bin").asString()) || account.isBlank()
                || (!receiverAccount.isBlank() && !receiverAccount.equals(account))
                || (!receiverName.isBlank()
                    && !receiverName.equalsIgnoreCase(link.path("accountName").asString().trim()))) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Chưa xác minh được tài khoản nhận tiền của mã QR. Vui lòng liên hệ quản lý.");
        }
        return new Checkout("https://pay.payos.vn/web/" + linkId);
    }

    public Verification verify(String number, ActorService.Actor actor) {
        requireConfigured();
        InvoiceResponse current = invoices.getOne(number, actor);
        if ("PAID".equals(current.getStatus())) return new Verification("PAID", current);
        long amount = amount(invoices.payableDue(number, actor));
        long order = orderCode(invoices.invoiceId(number, actor));

        JsonNode link = fetchLink(Long.toString(order));
        String state = link.path("status").asString();
        if ("CANCELLED".equals(state) || "EXPIRED".equals(state)) {
            try {
                JsonNode replacement = fetchLink(Long.toString(Math.addExact(order, REPLACEMENT_STEP)));
                link = replacement;
                order = Math.addExact(order, REPLACEMENT_STEP);
            } catch (ApiException exception) {
                // No replacement link was created; report the original link state.
            }
        }
        if (link.path("orderCode").asLong(-1) != order) throw providerError();
        String status = link.path("status").asString();
        if (!"PAID".equals(status)) return new Verification(status, null);

        String linkId = link.path("id").asString();
        if (link.path("amount").asLong(-1) != amount
                || link.path("amountPaid").asLong(-1) != amount
                || link.path("amountRemaining").asLong(-1) != 0
                || !linkId.matches("[0-9a-fA-F]{32}")) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Giao dịch cần được đối soát thủ công trước khi xác nhận hóa đơn " + number + ".");
        }
        return new Verification("PAID", invoices.confirmPayosPayment(
                number, "PAYOS-" + linkId, BigDecimal.valueOf(amount), actor));
    }

    private JsonNode fetchLink(String order) {
        try {
            JsonNode result = client.get().uri(REQUESTS + "/{order}", order)
                    .header("x-client-id", clientId).header("x-api-key", apiKey)
                    .retrieve().body(JsonNode.class);
            if (result != null && "00".equals(result.path("code").asString())) {
                return result.path("data");
            }
        } catch (RestClientException exception) {
            throw providerError();
        }
        throw providerError();
    }

    private void cancelLink(long order, long amount) {
        try {
            JsonNode response = client.post().uri(REQUESTS + "/{order}/cancel", order)
                    .header("x-client-id", clientId).header("x-api-key", apiKey)
                    .body(Map.of("cancellationReason", "Thay link QR do doi so tien"))
                    .retrieve().body(JsonNode.class);
            if (response != null && "00".equals(response.path("code").asString())) {
                JsonNode link = response.path("data");
                if (link.path("orderCode").asLong(-1) == order && link.path("amount").asLong(-1) == amount
                        && "CANCELLED".equals(link.path("status").asString())
                        && link.path("amountPaid").asLong(-1) == 0) {
                    return;
                }
            }
        } catch (RestClientException exception) {
            throw providerError();
        }
        throw providerError();
    }

    private void requireConfigured() {
        if (!enabled || clientId.isBlank() || apiKey.isBlank() || checksumKey.isBlank()
                || frontendUrl.isBlank() || orderOffset <= 0
                || receiverBin.isBlank() || (receiverAccount.isBlank() && receiverName.isBlank())) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Chuyển khoản QR chưa được cấu hình.");
        }
    }

    private long orderCode(Long invoiceId) {
        return Math.addExact(Math.addExact(orderOffset, INVOICE_ORDER_BASE), invoiceId);
    }

    private String returnUrl(String number) {
        return frontendUrl.replaceAll("/+$", "") + "/frontdesk/invoices/" + number + "?payos=1";
    }

    private static long amount(BigDecimal due) {
        try {
            long value = due.longValueExact();
            if (value > 0) return value;
        } catch (ArithmeticException | NullPointerException exception) {
            // payOS accepts whole VND only.
        }
        throw ApiException.conflict("Số tiền cần thanh toán phải là số nguyên VND lớn hơn 0.");
    }

    private String sign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(checksumKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("Cannot sign payOS request", exception);
        }
    }

    private static ApiException providerError() {
        return new ApiException(HttpStatus.BAD_GATEWAY,
                "Chưa lấy được thông tin giao dịch từ payOS. Vui lòng thử lại.");
    }

    public record Checkout(String checkoutUrl) {}
    public record Verification(String status, InvoiceResponse invoice) {}
}
