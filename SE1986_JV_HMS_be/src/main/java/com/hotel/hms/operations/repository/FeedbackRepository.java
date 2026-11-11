package com.hotel.hms.operations.repository;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.dto.HousekeepingDashboardResponse.*;

import org.springframework.jdbc.core.*;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.*;
import java.time.*;
import java.util.*;

/** Database access for Module E; business rules and transactions remain in the service. */
@Repository
public class FeedbackRepository {
    private final JdbcTemplate jdbc;

    public FeedbackRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Customer(Long id, String name) {}

    public record BookingState(Long id, Long customerId, Long hotelId, String status) {}

    public record FeedbackState(Long id, Long hotelId, String reply) {}

    public List<Customer> findCustomers(String email) {
        return jdbc.query(
                """
                        SELECT u.user_id, u.full_name FROM identity_access.users u
                        WHERE u.email=? AND u.is_active=1 AND EXISTS (
                            SELECT 1 FROM identity_access.user_roles ur JOIN identity_access.roles r ON r.role_id=ur.role_id
                            WHERE ur.user_id=u.user_id AND r.code='CUSTOMER' AND r.is_active=1)
                        """,
                (rs, i) -> new Customer(rs.getLong("user_id"), rs.getString("full_name")),
                email);
    }

    public List<FeedbackBookingResponse> findEligibleBookings(Long customerId) {
        return jdbc.query(
                """
                        SELECT b.booking_id,b.booking_code,h.name AS hotel_name,b.check_out_date
                        FROM booking.bookings b JOIN identity_access.hotels h ON h.hotel_id=b.hotel_id
                        WHERE b.customer_id=? AND b.status='CHECKED_OUT'
                          AND NOT EXISTS (SELECT 1 FROM operations.feedback f WHERE f.booking_id=b.booking_id)
                        ORDER BY b.check_out_date DESC,b.booking_id DESC
                        """,
                (rs, i) ->
                        new FeedbackBookingResponse(
                                rs.getLong("booking_id"),
                                rs.getString("booking_code"),
                                rs.getString("hotel_name"),
                                rs.getDate("check_out_date").toLocalDate(),
                                List.of()),
                customerId);
    }

    public List<FeedbackResponse> findMine(
            Long customerId, int page, int size, String bookingCode) {
        return jdbc.query(
                SELECT_FEEDBACK
                        + """
                WHERE f.customer_id=? AND (? = '' OR b.booking_code=?) ORDER BY f.created_at DESC,f.feedback_id DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """,
                MAPPER,
                customerId,
                bookingCode,
                bookingCode,
                (long) page * size,
                size);
    }

    public List<FeedbackResponse> findManaged(
            int admin, Long managerId, int page, int size, int rating, String status) {
        return jdbc.query(
                SELECT_FEEDBACK
                        + """
                WHERE (?=1 OR EXISTS (SELECT 1 FROM identity_access.staff ms
                       WHERE ms.user_id=? AND ms.hotel_id=b.hotel_id AND ms.is_active=1))
                  AND (?=0 OR f.rating=?)
                  AND (?='' OR (?='PENDING' AND f.reply IS NULL) OR (?='REPLIED' AND f.reply IS NOT NULL))
                ORDER BY f.created_at DESC,f.feedback_id DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """,
                MAPPER,
                admin,
                managerId,
                rating,
                rating,
                status,
                status,
                status,
                (long) page * size,
                size);
    }

    public List<BookingState> findBooking(Long bookingId) {
        return jdbc.query(
                """
                        SELECT booking_id,customer_id,hotel_id,status FROM booking.bookings WHERE booking_id=?
                        """,
                (rs, i) ->
                        new BookingState(
                                rs.getLong("booking_id"),
                                rs.getLong("customer_id"),
                                rs.getLong("hotel_id"),
                                rs.getString("status")),
                bookingId);
    }

    public List<FeedbackState> findFeedback(Long id) {
        return jdbc.query(
                """
                        SELECT f.feedback_id,b.hotel_id,f.reply FROM operations.feedback f
                        JOIN booking.bookings b ON b.booking_id=f.booking_id WHERE f.feedback_id=?
                        """,
                (rs, i) ->
                        new FeedbackState(
                                rs.getLong("feedback_id"),
                                rs.getLong("hotel_id"),
                                rs.getString("reply")),
                id);
    }

    public int reply(Long id, String reply, Long managerId) {
        return jdbc.update(
                connection -> {
                    var statement =
                            connection.prepareStatement(
                                    """
                                            UPDATE operations.feedback SET reply=?,replied_by=?,replied_at=SYSUTCDATETIME(),updated_at=SYSUTCDATETIME()
                                            WHERE feedback_id=? AND reply IS NULL
                                            """);
                    statement.setNString(1, reply);
                    statement.setLong(2, managerId);
                    statement.setLong(3, id);
                    return statement;
                });
    }

    public Map<Long, List<String>> roomsByBooking(List<Long> bookingIds) {
        Map<Long, List<String>> result = new HashMap<>();
        if (bookingIds == null || bookingIds.isEmpty()) return result;
        String marks = String.join(",", Collections.nCopies(bookingIds.size(), "?"));
        jdbc.query(
                """
                            SELECT br.booking_id,r.room_number,t.name AS type_name
                            FROM booking.booking_rooms br JOIN inventory.rooms r ON r.room_id=br.room_id
                            JOIN inventory.room_types t ON t.room_type_id=r.room_type_id
                            WHERE br.booking_id IN ("""
                        + marks
                        + ") ORDER BY r.room_number",
                rs -> {
                    result.computeIfAbsent(rs.getLong("booking_id"), k -> new ArrayList<>())
                            .add(
                                    "Phòng "
                                            + rs.getString("room_number")
                                            + " ("
                                            + rs.getString("type_name")
                                            + ")");
                },
                bookingIds.toArray());
        return result;
    }

    private static final String SELECT_FEEDBACK =
            """
            SELECT f.feedback_id,f.booking_id,b.booking_code,h.name AS hotel_name,u.full_name AS guest_name,
                   f.rating,f.comment,f.reply,ru.full_name AS replied_by,f.replied_at,f.created_at
            FROM operations.feedback f JOIN booking.bookings b ON b.booking_id=f.booking_id
            JOIN identity_access.hotels h ON h.hotel_id=b.hotel_id
            JOIN identity_access.users u ON u.user_id=f.customer_id
            LEFT JOIN identity_access.users ru ON ru.user_id=f.replied_by
            """;

    private static LocalDateTime time(ResultSet rs, String name) throws SQLException {
        var timestamp = rs.getTimestamp(name);
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private static final RowMapper<FeedbackResponse> MAPPER =
            (rs, i) ->
                    new FeedbackResponse(
                            rs.getLong("feedback_id"),
                            rs.getLong("booking_id"),
                            rs.getString("booking_code"),
                            rs.getString("hotel_name"),
                            rs.getString("guest_name"),
                            rs.getInt("rating"),
                            rs.getString("comment"),
                            rs.getString("reply"),
                            rs.getString("replied_by"),
                            time(rs, "replied_at"),
                            time(rs, "created_at"),
                            List.of());

    public Long insert(CreateFeedbackRequest request, Long actorId, Long bookingId) {
        var keys = new GeneratedKeyHolder();
        jdbc.update(
                connection -> {
                    var statement =
                            connection.prepareStatement(
                                    """
                                        INSERT INTO operations.feedback(booking_id,customer_id,rating,comment) VALUES(?,?,?,?)
                                        """,
                                    Statement.RETURN_GENERATED_KEYS);
                    statement.setLong(1, bookingId);
                    statement.setLong(2, actorId);
                    statement.setInt(3, request.rating());
                    statement.setNString(4, request.comment());
                    return statement;
                },
                keys);
        Number id = keys.getKey();
        if (id == null) throw new IllegalStateException("Database did not return feedback ID");
        return id.longValue();
    }
}
