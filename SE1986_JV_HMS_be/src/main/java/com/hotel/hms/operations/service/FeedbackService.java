package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.security.OperationsIdentity;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.sql.*;
import java.time.LocalDateTime;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class FeedbackService {
    private final JdbcTemplate jdbc;
    private final OperationsIdentity identity;
    private final IssueAssignmentService managerContext;

    public FeedbackService(
            JdbcTemplate jdbc, OperationsIdentity identity, IssueAssignmentService managerContext) {
        this.jdbc = jdbc;
        this.identity = identity;
        this.managerContext = managerContext;
    }

    public record Customer(Long id, String name) {}

    public record BookingState(Long id, Long customerId, Long hotelId, String status) {}

    public record FeedbackState(Long id, Long hotelId, String reply) {}

    private Customer currentCustomer() {
        String email = identity.email();
        var users =
                jdbc.query(
                        """
                        SELECT u.user_id, u.full_name FROM identity_access.users u
                        WHERE u.email=? AND u.is_active=1 AND EXISTS (
                            SELECT 1 FROM identity_access.user_roles ur JOIN identity_access.roles r ON r.role_id=ur.role_id
                            WHERE ur.user_id=u.user_id AND r.code='CUSTOMER' AND r.is_active=1)
                        """,
                        (rs, i) -> new Customer(rs.getLong("user_id"), rs.getString("full_name")),
                        email);
        return users.isEmpty() ? null : users.getFirst();
    }

    private Customer requireCustomer() {
        var customer = currentCustomer();
        if (customer == null)
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản hiện tại cần vai trò CUSTOMER đang hoạt động.");
        return customer;
    }

    public FeedbackContext getContext() {
        var customer = currentCustomer();
        return customer == null
                ? new FeedbackContext(
                        false, null, "Tài khoản hiện tại không có vai trò CUSTOMER đang hoạt động.")
                : new FeedbackContext(true, customer.name(), "Khách hàng đang đăng nhập.");
    }

    public List<FeedbackBookingResponse> eligibleBookings() {
        // Only the current customer's checked-out stays without feedback can be selected.
        var customer = requireCustomer();
        var items =
                jdbc.query(
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
                        customer.id());
        var rooms = roomsByBooking(items.stream().map(FeedbackBookingResponse::id).toList());
        return items.stream()
                .map(item -> item.withRooms(rooms.getOrDefault(item.id(), List.of())))
                .toList();
    }

    private Map<Long, List<String>> roomsByBooking(List<Long> bookingIds) {
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

    private List<FeedbackResponse> withRooms(List<FeedbackResponse> items) {
        var rooms =
                roomsByBooking(items.stream().map(FeedbackResponse::bookingId).distinct().toList());
        return items.stream()
                .map(item -> item.withRooms(rooms.getOrDefault(item.bookingId(), List.of())))
                .toList();
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

    public List<FeedbackResponse> myFeedback(int page, int size) {
        return myFeedback(page, size, "");
    }

    public List<FeedbackResponse> myFeedback(int page, int size, String bookingCode) {
        var customer = requireCustomer();
        return withRooms(
                jdbc.query(
                        SELECT_FEEDBACK
                                + """
                WHERE f.customer_id=? AND (? = '' OR b.booking_code=?) ORDER BY f.created_at DESC,f.feedback_id DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """,
                        MAPPER,
                        customer.id(),
                        bookingCode,
                        bookingCode,
                        (long) page * size,
                        size));
    }

    public List<FeedbackResponse> managedFeedback(int page, int size, int rating, String status) {
        var manager = managerContext.requireManager();
        return withRooms(
                jdbc.query(
                        SELECT_FEEDBACK
                                + """
                WHERE (?=1 OR EXISTS (SELECT 1 FROM identity_access.staff ms
                       WHERE ms.user_id=? AND ms.hotel_id=b.hotel_id AND ms.is_active=1))
                  AND (?=0 OR f.rating=?)
                  AND (?='' OR (?='PENDING' AND f.reply IS NULL) OR (?='REPLIED' AND f.reply IS NOT NULL))
                ORDER BY f.created_at DESC,f.feedback_id DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """,
                        MAPPER,
                        manager.admin() ? 1 : 0,
                        manager.id(),
                        rating,
                        rating,
                        status,
                        status,
                        status,
                        (long) page * size,
                        size));
    }

    @Transactional
    public Long create(CreateFeedbackRequest request) {
        // Recheck ownership and checkout status even when the UI already filtered the list.
        var customer = requireCustomer();
        var bookings =
                jdbc.query(
                        """
                        SELECT booking_id,customer_id,hotel_id,status FROM booking.bookings WHERE booking_id=?
                        """,
                        (rs, i) ->
                                new BookingState(
                                        rs.getLong("booking_id"),
                                        rs.getLong("customer_id"),
                                        rs.getLong("hotel_id"),
                                        rs.getString("status")),
                        request.bookingId());
        if (bookings.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        var booking = bookings.getFirst();
        if (!customer.id().equals(booking.customerId()))
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Booking belongs to another customer");
        if (!"CHECKED_OUT".equals(booking.status()))
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Feedback requires a checked-out booking");
        var keys = new GeneratedKeyHolder();
        try {
            jdbc.update(
                    connection -> {
                        var statement =
                                connection.prepareStatement(
                                        """
                                        INSERT INTO operations.feedback(booking_id,customer_id,rating,comment) VALUES(?,?,?,?)
                                        """,
                                        Statement.RETURN_GENERATED_KEYS);
                        statement.setLong(1, booking.id());
                        statement.setLong(2, customer.id());
                        statement.setInt(3, request.rating());
                        statement.setNString(4, request.comment());
                        return statement;
                    },
                    keys);
        } catch (DuplicateKeyException exception) {
            // The database also rejects duplicate feedback from simultaneous submissions.
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "This booking already has feedback");
        }
        if (keys.getKey() == null)
            throw new IllegalStateException("Database did not return feedback ID");
        return keys.getKey().longValue();
    }

    @Transactional
    public void reply(Long id, ReplyFeedbackRequest request) {
        var manager = managerContext.requireManager();
        var feedback =
                jdbc.query(
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
        if (feedback.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found");
        managerContext.assertScope(manager, feedback.getFirst().hotelId());
        if (feedback.getFirst().reply() != null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Feedback already replied");
        int changed =
                jdbc.update(
                        connection -> {
                            var statement =
                                    connection.prepareStatement(
                                            """
                                            UPDATE operations.feedback SET reply=?,replied_by=?,replied_at=SYSUTCDATETIME(),updated_at=SYSUTCDATETIME()
                                            WHERE feedback_id=? AND reply IS NULL
                                            """);
                            statement.setNString(1, request.reply());
                            statement.setLong(2, manager.id());
                            statement.setLong(3, id);
                            return statement;
                        });
        if (changed != 1)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Feedback changed concurrently");
    }
}
