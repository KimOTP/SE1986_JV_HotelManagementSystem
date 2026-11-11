package com.hotel.hms.operations.repository;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.dto.HousekeepingDashboardResponse.*;

import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;

import java.sql.*;
import java.time.*;
import java.util.*;

/** Database access for Module E; business rules and transactions remain in the service. */
@Repository
public class IssueProgressRepository {
    private final JdbcTemplate jdbc;

    public IssueProgressRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Worker(Long staffId, Long hotelId, String name) {}

    public record IssueState(Long id, Long hotelId, Long assignedStaffId, String status) {}

    public List<Worker> findWorkers(String email) {
        return jdbc.query(
                """
                        SELECT s.staff_id, s.hotel_id, u.full_name
                        FROM identity_access.staff s
                        JOIN identity_access.users u ON u.user_id = s.user_id
                        JOIN identity_access.hotels h ON h.hotel_id = s.hotel_id
                        WHERE u.email = ? AND s.is_active = 1 AND u.is_active = 1 AND h.is_active = 1
                          AND EXISTS (
                              SELECT 1 FROM identity_access.user_roles ur
                              JOIN identity_access.roles r ON r.role_id = ur.role_id
                              WHERE ur.user_id = u.user_id AND r.code = 'HOUSEKEEPER' AND r.is_active = 1
                          )
                        """,
                (rs, row) ->
                        new Worker(
                                rs.getLong("staff_id"),
                                rs.getLong("hotel_id"),
                                rs.getString("full_name")),
                email);
    }

    public List<IssueState> findActiveIssue(Long issueId) {
        return jdbc.query(
                """
                        SELECT i.issue_id, rt.hotel_id, i.assigned_staff_id, i.status
                        FROM operations.issues i
                        JOIN inventory.rooms r ON r.room_id = i.room_id
                        JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                        JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                        WHERE i.issue_id = ? AND r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                        """,
                (rs, row) ->
                        new IssueState(
                                rs.getLong("issue_id"),
                                rs.getLong("hotel_id"),
                                rs.getObject("assigned_staff_id", Long.class),
                                rs.getString("status")),
                issueId);
    }

    public int startIssue(Long issueId, Long staffId) {
        return jdbc.update(
                """
                        UPDATE operations.issues
                        SET status = 'IN_PROGRESS', updated_at = SYSUTCDATETIME()
                        WHERE issue_id = ? AND assigned_staff_id = ? AND status = 'ASSIGNED'
                        """,
                issueId,
                staffId);
    }

    public int startLinkedTask(Long issueId, Long staffId) {
        return jdbc.update(
                """
                        UPDATE operations.tasks
                        SET status = 'IN_PROGRESS', started_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                        WHERE issue_id = ? AND assigned_staff_id = ? AND status = 'PENDING'
                        """,
                issueId,
                staffId);
    }

    public int resolveIssue(Long issueId, Long staffId, ResolveIssueRequest request) {
        return jdbc.update(
                connection -> {
                    var statement =
                            connection.prepareStatement(
                                    """
                                            UPDATE operations.issues
                                            SET status = 'RESOLVED', resolution_note = ?, resolved_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                                            WHERE issue_id = ? AND assigned_staff_id = ? AND status = 'IN_PROGRESS'
                                            """);
                    statement.setNString(1, request.resolutionNote());
                    statement.setLong(2, issueId);
                    statement.setLong(3, staffId);
                    return statement;
                });
    }

    public int completeLinkedTask(Long issueId, Long staffId) {
        return jdbc.update(
                """
                        UPDATE operations.tasks
                        SET status = 'COMPLETED', started_at = COALESCE(started_at, SYSUTCDATETIME()),
                            completed_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                        WHERE issue_id = ? AND assigned_staff_id = ? AND status = 'IN_PROGRESS'
                        """,
                issueId,
                staffId);
    }
}
