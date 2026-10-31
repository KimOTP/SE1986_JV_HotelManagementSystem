package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.*;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
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
    private final Environment environment;

    public IssueReportService(JdbcTemplate jdbc, Environment environment) {
        this.jdbc = jdbc;
        this.environment = environment;
    }

    public record Reporter(Long id, String name) {}

    private Reporter configuredReporter() {
        if (!environment.acceptsProfiles(Profiles.of("local-demo"))) return null;
        String email = environment.getProperty("operations.demo-reporter-email", "").trim();
        if (email.isEmpty()) return null;
        var reporters = jdbc.query("""
                SELECT user_id, full_name FROM identity_access.users
                WHERE email = ? AND is_active = 1
                """, (rs, row) -> new Reporter(rs.getLong("user_id"), rs.getString("full_name")), email);
        return reporters.isEmpty() ? null : reporters.getFirst();
    }

    @Transactional(readOnly = true)
    public IssueReportingContext getContext() {
        Reporter reporter = configuredReporter();
        return reporter == null
                ? new IssueReportingContext(false, null,
                    "Chưa bật ghi dữ liệu local-demo hoặc người báo cáo cấu hình không hoạt động.")
                : new IssueReportingContext(true, reporter.name(),
                    "Chế độ local-demo: báo cáo ghi vào SQL Server dưới tên người báo cáo cấu hình tại backend.");
    }

    @Transactional(readOnly = true)
    public List<IssueRoomResponse> getRooms() {
        return jdbc.query("""
                SELECT r.room_id, r.room_number, h.name AS hotel_name
                FROM inventory.rooms r
                JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                WHERE r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                ORDER BY h.hotel_id, r.room_number, r.room_id
                """, (rs, row) -> new IssueRoomResponse(rs.getLong("room_id"),
                rs.getString("room_number"), rs.getString("hotel_name")));
    }

    @Transactional
    public CreatedIssueResponse create(CreateIssueRequest request) {
        Reporter reporter = configuredReporter();
        if (reporter == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Issue reporting requires a configured local-demo reporter until JWT is integrated");
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
