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
        String sql = """
                INSERT INTO billing.payment_transactions (
                    booking_id, invoice_id, transaction_code, transaction_type, method,
                    amount, status, provider_reference, refund_of_transaction_id,
                    processed_by, paid_at, created_at
                ) VALUES (?, NULL, ?, 'DEPOSIT', ?, ?, 'SUCCESS', NULL, NULL, NULL, ?, ?)
                """;
        jdbc.update(sql, bookingId, transactionCode, dbMethod, amount, paidAt, paidAt);
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
