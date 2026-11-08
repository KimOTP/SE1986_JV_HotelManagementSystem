package com.hotel.hms.bookings.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * JDBC read model cho màn "Đặt phòng của tôi" (UC-C3) và trang chi tiết (UC-C6).
 *
 * <p>Booking được tạo bởi {@link BookingCreationRepository}; phần đọc dùng
 * JdbcTemplate riêng để trả đúng dữ liệu join (loại phòng, phòng vật lý, tiền
 * cọc đã thu) mà không cần entity JPA cho cả schema.</p>
 */
@Repository
public class BookingQueryRepository {

    /**
     * Tiền cọc đã thu được cộng từ giao dịch DEPOSIT thành công. Bảng booking
     * không có cột deposit_paid nên đây là nguồn duy nhất.
     */
    private static final String DEPOSIT_PAID_SUBQUERY = """
            COALESCE((
                SELECT SUM(pt.amount)
                FROM billing.payment_transactions pt
                WHERE pt.booking_id = b.booking_id
                  AND pt.transaction_type = 'DEPOSIT'
                  AND pt.status = 'SUCCESS'
            ), 0) AS deposit_paid
            """;

    private static final String BOOKING_COLUMNS = """
            b.booking_id, b.booking_code, b.customer_id, b.hotel_id,
            b.check_in_date, b.check_out_date, b.guest_count, b.status,
            b.contact_name, b.contact_email, b.contact_phone, b.special_requests,
            b.deposit_required, b.hold_expires_at, b.cancel_reason, b.cancelled_at, b.created_at,
            """;

    private final JdbcTemplate jdbc;

    public BookingQueryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Danh sách booking của một khách, mới nhất trước. {@code status} rỗng nghĩa
     * là không lọc. Phân trang bằng OFFSET/FETCH của SQL Server.
     */
    public List<BookingRow> findByCustomer(long customerId, String status, int offset, int limit) {
        boolean filtered = status != null && !status.isBlank();
        String sql = """
                SELECT %s %s
                FROM booking.bookings b
                WHERE b.customer_id = ?
                %s
                ORDER BY b.created_at DESC, b.booking_id DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """.formatted(BOOKING_COLUMNS, DEPOSIT_PAID_SUBQUERY,
                filtered ? "AND b.status = ?" : "");

        Object[] args = filtered
                ? new Object[]{customerId, status, offset, limit}
                : new Object[]{customerId, offset, limit};

        return jdbc.query(sql, (rs, rowNum) -> mapRow(rs), args);
    }

    public Optional<BookingRow> findByCode(String bookingCode) {
        String sql = """
                SELECT %s %s
                FROM booking.bookings b
                WHERE b.booking_code = ?
                """.formatted(BOOKING_COLUMNS, DEPOSIT_PAID_SUBQUERY);

        return jdbc.query(sql, (rs, rowNum) -> mapRow(rs), bookingCode).stream().findFirst();
    }

    /**
     * Danh sách cho console quản lý (UC-2.9 / UC-C5): mọi khách hàng, lọc theo
     * trạng thái và từ khóa (mã đơn, tên, email, điện thoại).
     */
    public List<BookingRow> findForManagement(String status, String keyword, int offset, int limit) {
        QueryParts filter = managementFilter(status, keyword);
        String sql = """
                SELECT %s %s
                FROM booking.bookings b
                %s
                ORDER BY b.created_at DESC, b.booking_id DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """.formatted(BOOKING_COLUMNS, DEPOSIT_PAID_SUBQUERY, filter.where());

        List<Object> args = new ArrayList<>(filter.args());
        args.add(offset);
        args.add(limit);
        return jdbc.query(sql, (rs, rowNum) -> mapRow(rs), args.toArray());
    }

    public long countForManagement(String status, String keyword) {
        QueryParts filter = managementFilter(status, keyword);
        String sql = "SELECT COUNT(*) FROM booking.bookings b " + filter.where();
        Long total = jdbc.queryForObject(sql, Long.class, filter.args().toArray());
        return total == null ? 0 : total;
    }

    private static QueryParts managementFilter(String status, String keyword) {
        StringBuilder where = new StringBuilder("WHERE 1 = 1");
        List<Object> args = new ArrayList<>();

        if (status != null && !status.isBlank()) {
            where.append(" AND b.status = ?");
            args.add(status);
        }
        if (keyword != null && !keyword.isBlank()) {
            where.append("""
                     AND (LOWER(b.booking_code) LIKE ?
                          OR LOWER(b.contact_name) LIKE ?
                          OR LOWER(b.contact_email) LIKE ?
                          OR b.contact_phone LIKE ?)
                    """);
            String like = "%" + keyword.trim().toLowerCase(java.util.Locale.ROOT) + "%";
            args.add(like);
            args.add(like);
            args.add(like);
            args.add(like);
        }
        return new QueryParts(where.toString(), args);
    }

    private record QueryParts(String where, List<Object> args) {
    }

    /**
     * Phòng vật lý của các booking trong một truy vấn để tránh N+1 khi render
     * danh sách.
     */
    public List<BookingRoomRow> findRooms(List<Long> bookingIds) {
        if (bookingIds == null || bookingIds.isEmpty()) {
            return Collections.emptyList();
        }

        String placeholders = String.join(",", Collections.nCopies(bookingIds.size(), "?"));
        String sql = """
                SELECT br.booking_id, br.room_id, r.room_number,
                       rt.room_type_id, rt.name AS room_type_name, br.nightly_rate
                FROM booking.booking_rooms br
                JOIN inventory.rooms r ON r.room_id = br.room_id
                JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                WHERE br.booking_id IN (%s)
                ORDER BY br.booking_id, r.room_number
                """.formatted(placeholders);

        return jdbc.query(sql, (rs, rowNum) -> new BookingRoomRow(
                rs.getLong("booking_id"),
                rs.getLong("room_id"),
                rs.getString("room_number"),
                rs.getLong("room_type_id"),
                rs.getString("room_type_name"),
                rs.getBigDecimal("nightly_rate")
        ), bookingIds.toArray());
    }

    /**
     * Hủy nguyên tử: chỉ cập nhật khi trạng thái hiện tại còn cho phép hủy. Trả
     * về 0 khi một request khác vừa đổi trạng thái trước đó.
     */
    public int cancel(long bookingId, String reason, LocalDateTime cancelledAt) {
        String sql = """
                UPDATE booking.bookings
                SET status = 'CANCELLED',
                    cancel_reason = ?,
                    cancelled_at = ?,
                    updated_at = ?
                WHERE booking_id = ?
                  AND status IN ('PENDING', 'CONFIRMED')
                """;
        return jdbc.update(sql, reason, cancelledAt, cancelledAt, bookingId);
    }

    /**
     * Booking PENDING đã quá hạn giữ chỗ. Procedure tìm phòng đã tự bỏ qua các
     * booking này; job chỉ đồng bộ trạng thái để khách thấy "Hết hạn giữ chỗ".
     */
    public List<ExpiredHold> findExpiredHolds(LocalDateTime now, int limit) {
        String sql = """
                SELECT TOP (?) booking_id, booking_code
                FROM booking.bookings
                WHERE status = 'PENDING'
                  AND hold_expires_at IS NOT NULL
                  AND hold_expires_at <= ?
                ORDER BY hold_expires_at
                """;
        return jdbc.query(sql, (rs, rowNum) -> new ExpiredHold(
                rs.getLong("booking_id"),
                rs.getString("booking_code")
        ), limit, now);
    }

    /**
     * Chỉ chuyển PENDING → EXPIRED khi vẫn còn PENDING và đã quá hạn. Trả 0 nếu
     * một luồng khác (thanh toán, hủy) vừa đổi trạng thái trước đó.
     */
    public int expireHold(long bookingId, LocalDateTime now) {
        String sql = """
                UPDATE booking.bookings
                SET status = 'EXPIRED', updated_at = ?
                WHERE booking_id = ?
                  AND status = 'PENDING'
                  AND hold_expires_at IS NOT NULL
                  AND hold_expires_at <= ?
                """;
        return jdbc.update(sql, now, bookingId, now);
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

    public void insertCancellationHistory(long bookingId, String oldStatus, long changedBy, String note) {
        insertStatusHistory(bookingId, oldStatus, "CANCELLED", changedBy, note);
    }

    private static BookingRow mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        Date checkIn = rs.getDate("check_in_date");
        Date checkOut = rs.getDate("check_out_date");
        return new BookingRow(
                rs.getLong("booking_id"),
                rs.getString("booking_code"),
                rs.getLong("customer_id"),
                rs.getLong("hotel_id"),
                checkIn == null ? null : checkIn.toLocalDate(),
                checkOut == null ? null : checkOut.toLocalDate(),
                rs.getInt("guest_count"),
                rs.getString("status"),
                rs.getNString("contact_name"),
                rs.getNString("contact_email"),
                rs.getString("contact_phone"),
                rs.getNString("special_requests"),
                rs.getBigDecimal("deposit_required"),
                rs.getBigDecimal("deposit_paid"),
                timestamp(rs, "hold_expires_at"),
                rs.getNString("cancel_reason"),
                timestamp(rs, "cancelled_at"),
                timestamp(rs, "created_at")
        );
    }

    private static LocalDateTime timestamp(java.sql.ResultSet rs, String column)
            throws java.sql.SQLException {
        java.sql.Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toLocalDateTime();
    }

    public record BookingRow(long bookingId, String bookingCode, long customerId, long hotelId,
                             LocalDate checkIn, LocalDate checkOut, int guests, String status,
                             String contactName, String email, String phone, String specialRequests,
                             BigDecimal depositRequired, BigDecimal depositPaid,
                             LocalDateTime holdExpiresAt, String cancelReason,
                             LocalDateTime cancelledAt, LocalDateTime createdAt) {
    }

    public record BookingRoomRow(long bookingId, long roomId, String roomNumber,
                                 long roomTypeId, String roomTypeName, BigDecimal nightlyRate) {
    }

    public record ExpiredHold(long bookingId, String bookingCode) {
    }
}
