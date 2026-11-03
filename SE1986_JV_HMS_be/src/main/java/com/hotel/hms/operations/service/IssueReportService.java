package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.security.OperationsIdentity;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.sql.Statement;
import java.util.List;

@Service
public class IssueReportService {
    private final JdbcTemplate jdbc;
    private final OperationsIdentity identity;

    public IssueReportService(JdbcTemplate jdbc, OperationsIdentity identity) {
        this.jdbc = jdbc;
        this.identity = identity;
    }

    public record Reporter(Long id, String name) {}

    private Reporter currentReporter() {
        String email = identity.email();
        var reporters = jdbc.query("""
                SELECT user_id, full_name FROM identity_access.users
                WHERE email = ? AND is_active = 1
                """, (rs, row) -> new Reporter(rs.getLong("user_id"), rs.getString("full_name")), email);
        return reporters.isEmpty() ? null : reporters.getFirst();
    }

    @Transactional(readOnly = true)
    public IssueReportingContext getContext() {
        Reporter reporter = currentReporter();
        return reporter == null
                ? new IssueReportingContext(false, null,
                    "Người báo cáo không hoạt động.")
                : new IssueReportingContext(true, reporter.name(),
                    "Báo cáo được lưu bằng tài khoản đang đăng nhập.");
    }

    @Transactional(readOnly = true)
    public List<IssueRoomResponse> getRooms() {
        var user = identity.requireUser();
        return jdbc.query("""
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
                """, (rs, row) -> new IssueRoomResponse(rs.getLong("room_id"),
                rs.getString("room_number"), rs.getString("hotel_name")), user.getRoles().contains("ADMIN") ? 1 : 0, user.getId(), user.getId());
    }

    @Transactional
    public CreatedIssueResponse create(CreateIssueRequest request) {
        Reporter reporter = currentReporter();
        if (reporter == null) throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Tài khoản người báo cáo không hoạt động.");
        boolean validRoom = getRooms().stream().anyMatch(room -> room.id().equals(request.roomId()));
        if (!validRoom) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Room is not active or does not exist");
        Integer typeCount = jdbc.queryForObject("""
                SELECT COUNT(*) FROM operations.issue_types
                WHERE issue_type_id = ? AND is_active = 1
                """, Integer.class, request.issueTypeId());
        if (typeCount == null || typeCount == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Issue type is not active or does not exist");
        }
        // Append only: keep the existing JPA read models immutable; SQL supplies timestamps/row_version.
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                    INSERT INTO operations.issues
                    (room_id, issue_type_id, reported_by, title, description, priority, status)
                    VALUES (?, ?, ?, ?, ?, ?, 'OPEN')
                    """, Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, request.roomId());
            statement.setLong(2, request.issueTypeId());
            statement.setLong(3, reporter.id());
            statement.setNString(4, request.title().trim());
            statement.setNString(5, request.description().trim());
            statement.setString(6, request.priority());
            return statement;
        }, keyHolder);
        Number id = keyHolder.getKey();
        if (id == null) throw new IllegalStateException("Database did not return issue ID");
        return new CreatedIssueResponse(id.longValue(), "OPEN");
    }
}
