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
public class IssueReportRepository {
    private final JdbcTemplate jdbc;

    public IssueReportRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Reporter(Long id, String name) {}

    public List<Reporter> findActiveReporter(String email) {
        return jdbc.query(
                """
                        SELECT user_id, full_name FROM identity_access.users
                        WHERE email = ? AND is_active = 1
                        """,
                (rs, row) -> new Reporter(rs.getLong("user_id"), rs.getString("full_name")),
                email);
    }

    public List<IssueRoomResponse> findReportableRooms(int admin, Long userId) {
        return jdbc.query(
                """
                SELECT r.room_id, r.room_number, h.name AS hotel_name
                FROM inventory.rooms r
                JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                WHERE r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                  AND (? = 1 OR EXISTS (
                    SELECT 1 FROM identity_access.staff st WHERE st.user_id = ?
                      AND st.hotel_id = h.hotel_id AND st.is_active = 1
                  ) OR EXISTS (
                    SELECT 1 FROM booking.bookings b JOIN booking.booking_rooms br ON br.booking_id = b.booking_id
                    WHERE b.customer_id = ? AND br.room_id = r.room_id AND b.status = 'CHECKED_IN'
                  ))
                ORDER BY h.hotel_id, r.room_number, r.room_id
                """,
                (rs, row) ->
                        new IssueRoomResponse(
                                rs.getLong("room_id"),
                                rs.getString("room_number"),
                                rs.getString("hotel_name")),
                admin,
                userId,
                userId);
    }

    public Integer countActiveType(Long issueTypeId) {
        return jdbc.queryForObject(
                """
                        SELECT COUNT(*) FROM operations.issue_types
                        WHERE issue_type_id = ? AND is_active = 1
                        """,
                Integer.class,
                issueTypeId);
    }

    public Long insert(CreateIssueRequest request, Long actorId) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(
                connection -> {
                    var statement =
                            connection.prepareStatement(
                                    """
                                    INSERT INTO operations.issues
                                    (room_id, issue_type_id, reported_by, title, description, priority, status)
                                    VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
                                    """,
                                    Statement.RETURN_GENERATED_KEYS);
                    statement.setLong(1, request.roomId());
                    statement.setLong(2, request.issueTypeId());
                    statement.setLong(3, actorId);
                    statement.setNString(4, request.title().trim());
                    statement.setNString(5, request.description().trim());
                    statement.setString(6, request.priority());
                    return statement;
                },
                keyHolder);
        Number id = keyHolder.getKey();
        if (id == null) throw new IllegalStateException("Database did not return issue ID");
        return id.longValue();
    }
}
