package com.hotel.hms.bookings.service;

import com.hotel.hms.bookings.dto.BookingResponse;
import com.hotel.hms.bookings.repository.BookingPaymentRepository;
import com.hotel.hms.common.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
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
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_GATEWAY;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

@Service
public class BookingPayosService {

    private static final String REQUESTS = "/v2/payment-requests";
    private final BookingQueryService bookings;
    private final BookingDepositService deposits;
    private final BookingPaymentRepository paymentRepository;
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

    public BookingPayosService(BookingQueryService bookings, BookingDepositService deposits,
                               BookingPaymentRepository paymentRepository) {
        this.bookings = bookings;
        this.deposits = deposits;
        this.paymentRepository = paymentRepository;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(5));
        this.client = RestClient.builder().baseUrl("https://api-merchant.payos.vn")
                .requestFactory(factory).build();
    }

    public Checkout createCheckout(long userId, String bookingCode) {
        requireConfigured();
        BookingResponse booking = bookings.getByCode(userId, bookingCode, false);
        if (!"PENDING".equals(booking.status()) || booking.holdExpiresAt() == null) {
            throw new ApiException(CONFLICT, "BOOKING_NOT_PAYABLE", "Đơn không còn chờ đặt cọc.");
        }
        long expiry = booking.holdExpiresAt().toEpochSecond(ZoneOffset.UTC);
        if (expiry <= Instant.now().getEpochSecond()) {
            throw new ApiException(CONFLICT, "BOOKING_HOLD_EXPIRED", "Đơn đã hết hạn giữ phòng.");
        }
        long order = orderCode(booking);
        long amount = amount(booking);
        var verifiedLink = paymentRepository.findVerifiedPayosLink(booking.bookingId());
        if (verifiedLink.isPresent()) {
            String id = verifiedLink.get();
            JsonNode link = fetchLink(id);
            long actualOrder = link.path("orderCode").asLong(-1);
            validateLink(link, actualOrder == replacementOrder(order) ? actualOrder : order, amount);
            if (!id.equals(link.path("id").asString()) || !"PENDING".equals(link.path("status").asString())) {
                throw new ApiException(CONFLICT, "BOOKING_PAYOS_LINK_NOT_PENDING",
                        "Link không còn chờ thanh toán. Vui lòng kiểm tra trạng thái giao dịch.");
            }
            return new Checkout("https://pay.payos.vn/web/" + id);
        }
        return createOrResume(booking, order, amount, expiry, true);
    }

    private Checkout createOrResume(BookingResponse booking, long order, long amount,
                                    long expiry, boolean allowReplacement) {
        String returnUrl = frontendUrl.replaceAll("/+$", "")
                + "/bookings/deposit?payosBooking=" + booking.bookingCode();
        String description = "COC " + order;
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
        JsonNode link = created ? response.path("data") : fetchLink(order);
        validateLink(link, order, amount);
        String linkId = link.path(created ? "paymentLinkId" : "id").asString();
        if (!linkId.matches("[0-9a-fA-F]{32}")) {
            throw providerError();
        }
        if (!created && allowReplacement && link.path("amountPaid").asLong(-1) == 0
                && !paymentRepository.hasVerifiedPayosLink(booking.bookingId(), linkId)) {
            String status = link.path("status").asString();
            if ("PENDING".equals(status)) {
                cancelUnverifiedLink(order, amount);
            }
            if ("PENDING".equals(status) || "CANCELLED".equals(status)) {
                return createOrResume(booking, replacementOrder(order), amount, expiry, false);
            }
        }
        if (!"PENDING".equals(link.path("status").asString())) {
            throw new ApiException(CONFLICT, "BOOKING_PAYOS_LINK_NOT_PENDING",
                    "Link không còn chờ thanh toán. Vui lòng kiểm tra trạng thái giao dịch.");
        }
        if (!created && paymentRepository.hasVerifiedPayosLink(booking.bookingId(), linkId)) {
            return new Checkout("https://pay.payos.vn/web/" + linkId);
        }
        String account = link.path("accountNumber").asString();
        if (!receiverBin.equals(link.path("bin").asString()) || account.isBlank()
                || (!receiverAccount.isBlank() && !receiverAccount.equals(account))
                || (!receiverName.isBlank()
                    && !receiverName.equalsIgnoreCase(link.path("accountName").asString().trim()))) {
            throw new ApiException(CONFLICT, "BOOKING_PAYOS_RECEIVER_UNVERIFIED",
                    "Chưa xác minh được tài khoản nhận tiền của mã QR. Vui lòng liên hệ khách sạn.");
        }
        paymentRepository.rememberVerifiedPayosLink(booking.bookingId(), linkId, BigDecimal.valueOf(amount));
        return new Checkout("https://pay.payos.vn/web/" + linkId);
    }

    public Verification verify(long userId, String bookingCode) {
        requireConfigured();
        BookingResponse booking = bookings.getByCode(userId, bookingCode, false);
        long order = orderCode(booking);
        long amount = amount(booking);
        String verifiedId = paymentRepository.findVerifiedPayosLink(booking.bookingId()).orElse(null);
        JsonNode link = fetchLink(verifiedId == null ? Long.toString(order) : verifiedId);
        long actualOrder = link.path("orderCode").asLong(-1);
        if (verifiedId != null && verifiedId.equals(link.path("id").asString())
                && actualOrder == replacementOrder(order)) {
            order = actualOrder;
        }
        validateLink(link, order, amount);
        String status = link.path("status").asString();
        if (!"PAID".equals(status)) {
            return new Verification(status, null);
        }
        String linkId = link.path("id").asString();
        if (link.path("amountPaid").asLong(-1) != amount
                || link.path("amountRemaining").asLong(-1) != 0
                || !linkId.matches("[0-9a-fA-F]{32}")) {
            throw new ApiException(CONFLICT, "BOOKING_DEPOSIT_AMOUNT_MISMATCH",
                    "Giao dịch cần được khách sạn đối soát trước khi xác nhận.");
        }
        try {
            return new Verification("PAID", deposits.confirmPayosDeposit(userId, bookingCode,
                    BigDecimal.valueOf(amount), "PAYOS-" + linkId));
        } catch (ApiException exception) {
            throw new ApiException(CONFLICT, "BOOKING_DEPOSIT_REVIEW_REQUIRED",
                    "payOS đã nhận tiền. Vui lòng liên hệ khách sạn để đối soát đơn " + bookingCode + ".");
        }
    }

    private JsonNode fetchLink(long order) {
        return fetchLink(Long.toString(order));
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

    private void cancelUnverifiedLink(long order, long amount) {
        try {
            JsonNode response = client.post().uri(REQUESTS + "/{order}/cancel", order)
                    .header("x-client-id", clientId).header("x-api-key", apiKey)
                    .body(Map.of("cancellationReason", "Thay link QR chua xac minh"))
                    .retrieve().body(JsonNode.class);
            if (response != null && "00".equals(response.path("code").asString())) {
                JsonNode link = response.path("data");
                validateLink(link, order, amount);
                if ("CANCELLED".equals(link.path("status").asString())
                        && link.path("amountPaid").asLong(-1) == 0) {
                    return;
                }
            }
        } catch (RestClientException exception) {
            throw providerError();
        }
        throw providerError();
    }

    private static long replacementOrder(long order) {
        return Math.addExact(order, 1_000_000_000_000L);
    }

    private void requireConfigured() {
        if (!enabled || clientId.isBlank() || apiKey.isBlank() || checksumKey.isBlank()
                || frontendUrl.isBlank() || orderOffset <= 0
                || receiverBin.isBlank() || (receiverAccount.isBlank() && receiverName.isBlank())) {
            throw new ApiException(SERVICE_UNAVAILABLE, "BOOKING_PAYOS_UNAVAILABLE",
                    "Chuyển khoản QR chưa được cấu hình.");
        }
    }

    private long orderCode(BookingResponse booking) {
        return Math.addExact(orderOffset, booking.bookingId());
    }

    private static long amount(BookingResponse booking) {
        try {
            long value = booking.depositRequired().longValueExact();
            if (value > 0) return value;
        } catch (ArithmeticException | NullPointerException exception) {
            // payOS accepts whole VND only.
        }
        throw new ApiException(CONFLICT, "BOOKING_INVALID_DEPOSIT",
                "Tiền cọc phải là số nguyên VND lớn hơn 0.");
    }

    private static void validateLink(JsonNode link, long order, long amount) {
        if (link.path("orderCode").asLong(-1) != order || link.path("amount").asLong(-1) != amount) {
            throw providerError();
        }
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
        return new ApiException(BAD_GATEWAY, "BOOKING_PAYOS_ERROR",
                "Chưa lấy được thông tin giao dịch từ payOS. Vui lòng thử lại.");
    }

    public record Checkout(String checkoutUrl) {}
    public record Verification(String status, BookingResponse booking) {}
}
