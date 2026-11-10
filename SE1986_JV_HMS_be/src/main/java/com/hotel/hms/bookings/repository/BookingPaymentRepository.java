package com.hotel.hms.bookings.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * JDBC adapter cho luồng thanh toán tiền cọc (UC-2.5 / UC-C2).
 *
 * <p>Booking được khóa bằng {@code UPDLOCK, HOLDLOCK} để hai request thanh toán
 * đồng thời không thể cùng ghi một giao dịch; request thứ hai thấy trạng thái đã
 * đổi và nhận lỗi nghiệp vụ.</p>
 */
@Repository
public class BookingPaymentRepository {

    private final JdbcTemplate jdbc;

    public BookingPaymentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<PaymentTarget> lockBooking(String bookingCode) {
        String sql = """
                SELECT booking_id, booking_code, customer_id, status,
                       deposit_required, hold_expires_at
                FROM booking.bookings WITH (UPDLOCK, HOLDLOCK)
                WHERE booking_code = ?
                """;
        List<PaymentTarget> rows = jdbc.query(sql, (rs, rowNum) -> new PaymentTarget(
                rs.getLong("booking_id"),
                rs.getString("booking_code"),
                rs.getLong("customer_id"),
                rs.getString("status"),
                rs.getBigDecimal("deposit_required"),
                rs.getTimestamp("hold_expires_at") == null
                        ? null
                        : rs.getTimestamp("hold_expires_at").toLocalDateTime()
        ), bookingCode);
        return rows.stream().findFirst();
    }

    public void insertDepositTransaction(long bookingId, String transactionCode, String dbMethod,
                                         BigDecimal amount, LocalDateTime paidAt) {
        insertDepositTransaction(bookingId, transactionCode, dbMethod, amount, paidAt, null);
    }

    public void insertDepositTransaction(long bookingId, String transactionCode, String dbMethod,
                                         BigDecimal amount, LocalDateTime paidAt, String reference) {
        String sql = """
                INSERT INTO billing.payment_transactions (
                    booking_id, invoice_id, transaction_code, transaction_type, method,
                    amount, status, provider_reference, refund_of_transaction_id,
                    processed_by, paid_at, created_at
                ) VALUES (?, NULL, ?, 'DEPOSIT', ?, ?, 'SUCCESS', ?, NULL, NULL, ?, ?)
                """;
        jdbc.update(sql, bookingId, transactionCode, dbMethod, amount, reference, paidAt, paidAt);
    }

    public boolean hasDepositReference(long bookingId, String reference) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM billing.payment_transactions
                WHERE booking_id = ? AND provider_reference = ?
                  AND transaction_type = 'DEPOSIT' AND status = 'SUCCESS'
                """, Integer.class, bookingId, reference);
        return count != null && count > 0;
    }

    public boolean hasVerifiedPayosLink(long bookingId, String linkId) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM billing.payment_transactions
                WHERE booking_id = ? AND provider_reference = ?
                  AND transaction_type = 'DEPOSIT' AND status = 'PENDING'
                """, Integer.class, bookingId, "PAYOS-LINK-" + linkId);
        return count != null && count > 0;
    }

    public Optional<String> findVerifiedPayosLink(long bookingId) {
        return jdbc.query("""
                SELECT TOP 1 provider_reference FROM billing.payment_transactions
                WHERE booking_id = ? AND provider_reference LIKE 'PAYOS-LINK-%'
                ORDER BY transaction_id DESC
                """, (rs, row) -> rs.getString(1).substring("PAYOS-LINK-".length()), bookingId)
                .stream().findFirst();
    }

    public void rememberVerifiedPayosLink(long bookingId, String linkId, BigDecimal amount) {
        String reference = "PAYOS-LINK-" + linkId;
        jdbc.update("""
                INSERT INTO billing.payment_transactions
                    (booking_id, transaction_code, transaction_type, method, amount, status, provider_reference)
                SELECT ?, ?, 'DEPOSIT', 'BANK_TRANSFER', ?, 'PENDING', ?
                WHERE NOT EXISTS (
                    SELECT 1 FROM billing.payment_transactions WITH (UPDLOCK, HOLDLOCK)
                    WHERE provider_reference = ?
                )
                """, bookingId, reference, amount, reference, reference);
    }

    public void closeVerifiedPayosLink(long bookingId, String linkId) {
        jdbc.update("""
                UPDATE billing.payment_transactions SET status = 'CANCELLED'
                WHERE booking_id = ? AND provider_reference = ? AND status = 'PENDING'
                """, bookingId, "PAYOS-LINK-" + linkId);
    }

    /**
     * Chỉ xác nhận khi booking vẫn đang PENDING; trả 0 nếu luồng khác vừa đổi
     * trạng thái (hủy, hết hạn).
     */
    public int confirmAfterDeposit(long bookingId, LocalDateTime now) {
        String sql = """
                UPDATE booking.bookings
                SET status = 'CONFIRMED', updated_at = ?
                WHERE booking_id = ?
                  AND status = 'PENDING'
                """;
        return jdbc.update(sql, now, bookingId);
    }

    public void insertStatusHistory(long bookingId, String oldStatus, String newStatus,
                                    Long changedBy, String note) {
        String sql = """
                INSERT INTO booking.booking_status_history
                    (booking_id, old_status, new_status, changed_by, note)
                VALUES (?, ?, ?, ?, ?)
                """;
        jdbc.update(sql, bookingId, oldStatus, newStatus, changedBy, note);
    }

    public record PaymentTarget(long bookingId, String bookingCode, long customerId, String status,
                                BigDecimal depositRequired, LocalDateTime holdExpiresAt) {
    }
}
