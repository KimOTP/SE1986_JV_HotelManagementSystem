package com.hotel.hms.bookings.service;

import com.hotel.hms.bookings.dto.BookingResponse;
import com.hotel.hms.bookings.repository.BookingPaymentRepository;
import com.hotel.hms.bookings.repository.BookingPaymentRepository.PaymentTarget;
import com.hotel.hms.common.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Thanh toán tiền cọc trực tuyến (UC-2.5 — quyền UC-C2).
 *
 * <p>Dự án chỉ bán phòng online nên không có phương thức tiền mặt: chỉ nhận
 * {@code BANK_TRANSFER}, {@code CREDIT_CARD}, {@code E_WALLET}. Database
 * {@code billing.payment_transactions} chỉ có enum {@code CASH/BANK_TRANSFER/GATEWAY},
 * vì vậy thẻ và ví điện tử được ghi nhận là {@code GATEWAY}.</p>
 */
@Service
public class BookingDepositService {

    static final Set<String> ONLINE_METHODS = Set.of(
            "BANK_TRANSFER", "CREDIT_CARD", "E_WALLET");

    private static final Map<String, String> DATABASE_METHODS = Map.of(
            "BANK_TRANSFER", "BANK_TRANSFER",
            "CREDIT_CARD", "GATEWAY",
            "E_WALLET", "GATEWAY");

    private final BookingPaymentRepository repository;
    private final BookingQueryService queryService;
    private final ApplicationEventPublisher events;

    @Value("${BOOKING_PAYOS_ENABLED:false}")
    private boolean payosEnabled;

    public BookingDepositService(BookingPaymentRepository repository,
                                 BookingQueryService queryService, ApplicationEventPublisher events) {
        this.repository = repository;
        this.queryService = queryService;
        this.events = events;
    }

    /**
     * Ghi nhận thanh toán cọc và chuyển booking PENDING → CONFIRMED trong một
     * transaction. Trả về booking sau khi cập nhật (kèm {@code depositPaid}).
     */
    @Transactional
    public BookingResponse payDeposit(long customerId, String bookingCode, String method) {
        if (payosEnabled) {
            throw new ApiException(CONFLICT, "BOOKING_USE_PAYOS",
                    "Vui lòng thanh toán tiền cọc qua trang chuyển khoản payOS.");
        }
        return settleDeposit(customerId, bookingCode, method, null, null);
    }

    @Transactional
    public BookingResponse confirmPayosDeposit(long customerId, String bookingCode,
                                                BigDecimal verifiedAmount, String reference) {
        BookingResponse booking = settleDeposit(customerId, bookingCode, "BANK_TRANSFER", verifiedAmount, reference);
        repository.closeVerifiedPayosLink(booking.bookingId(), reference.substring("PAYOS-".length()));
        return booking;
    }

    private BookingResponse settleDeposit(long customerId, String bookingCode, String method,
                                          BigDecimal verifiedAmount, String reference) {
        if (bookingCode == null || bookingCode.isBlank()) {
            throw new ApiException(BAD_REQUEST, "BOOKING_CODE_REQUIRED", "Thiếu mã đặt phòng.");
        }

        String normalizedMethod = normalizeMethod(method);
        String dbMethod = DATABASE_METHODS.get(normalizedMethod);

        PaymentTarget target = repository.lockBooking(bookingCode.trim())
                .orElseThrow(() -> new ApiException(NOT_FOUND, "BOOKING_NOT_FOUND",
                        "Không tìm thấy đặt phòng này."));

        // Không xác nhận booking của người khác có tồn tại.
        if (target.customerId() != customerId) {
            throw new ApiException(NOT_FOUND, "BOOKING_NOT_FOUND",
                    "Không tìm thấy đặt phòng này.");
        }
        if (reference != null && repository.hasDepositReference(target.bookingId(), reference)) {
            return queryService.getByCode(customerId, target.bookingCode(), false);
        }
        if (!"PENDING".equals(target.status())) {
            throw new ApiException(CONFLICT, "BOOKING_NOT_PAYABLE",
                    "Chỉ thanh toán được đặt phòng đang chờ thanh toán.");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MILLIS);
        if (target.holdExpiresAt() != null && !target.holdExpiresAt().isAfter(now)) {
            throw new ApiException(CONFLICT, "BOOKING_HOLD_EXPIRED",
                    "Đặt phòng đã hết hạn giữ chỗ (quá 15 phút). Vui lòng đặt lại đơn mới.");
        }

        BigDecimal amount = target.depositRequired() == null
                ? BigDecimal.ZERO
                : target.depositRequired().setScale(2, RoundingMode.HALF_UP);
        if (amount.signum() <= 0) {
            throw new ApiException(CONFLICT, "BOOKING_DEPOSIT_NOT_REQUIRED",
                    "Đặt phòng này không yêu cầu tiền cọc.");
        }

        if (reference == null) {
            repository.insertDepositTransaction(target.bookingId(), newTransactionCode(),
                    dbMethod, amount, now);
        } else {
            if (amount.compareTo(verifiedAmount) != 0) {
                throw new ApiException(CONFLICT, "BOOKING_DEPOSIT_AMOUNT_MISMATCH",
                        "Số tiền đã nhận không khớp tiền cọc của đặt phòng.");
            }
            repository.insertDepositTransaction(target.bookingId(), newTransactionCode(),
                    dbMethod, amount, now, reference);
        }

        if (repository.confirmAfterDeposit(target.bookingId(), now) == 0) {
            // Hủy/hết hạn vừa thắng race: rollback toàn bộ giao dịch đã ghi.
            throw new ApiException(CONFLICT, "BOOKING_PAYMENT_CONFLICT",
                    "Đặt phòng vừa được cập nhật bởi giao dịch khác. Vui lòng tải lại trang.");
        }

        repository.insertStatusHistory(target.bookingId(), "PENDING", "CONFIRMED", customerId,
                "Đã thanh toán tiền cọc " + amount.toPlainString() + " qua " + normalizedMethod);

        BookingResponse booking = queryService.getByCode(customerId, target.bookingCode(), false);
        if (reference != null) {
            events.publishEvent(new BookingDepositConfirmed(booking, amount));
        }
        return booking;
    }

    public record BookingDepositConfirmed(BookingResponse booking, BigDecimal amount) {}

    private static String normalizeMethod(String method) {
        if (method == null || method.isBlank()) {
            throw new ApiException(BAD_REQUEST, "BOOKING_PAYMENT_METHOD_REQUIRED",
                    "Vui lòng chọn phương thức thanh toán trực tuyến.");
        }
        String normalized = method.trim().toUpperCase(Locale.ROOT);
        if (!ONLINE_METHODS.contains(normalized)) {
            throw new ApiException(BAD_REQUEST, "BOOKING_PAYMENT_METHOD_INVALID",
                    "Phương thức thanh toán không hợp lệ. Chỉ hỗ trợ BANK_TRANSFER, "
                            + "CREDIT_CARD, E_WALLET.");
        }
        return normalized;
    }

    private static String newTransactionCode() {
        return "DEP-" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 20).toUpperCase(Locale.ROOT);
    }
}
