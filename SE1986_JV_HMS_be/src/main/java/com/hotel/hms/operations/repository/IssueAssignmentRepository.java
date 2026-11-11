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
public class IssueAssignmentRepository {
    private final JdbcTemplate jdbc;

    public IssueAssignmentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Manager(Long id, String name, boolean admin) {}

    public record IssueState(Long id, Long hotelId, String status, Long assignedStaffId) {}

    public List<Manager> findManagers(String email) {
        return jdbc.query(
                """
                        SELECT u.user_id, u.full_name,
                               CASE WHEN EXISTS (
                                   SELECT 1 FROM identity_access.user_roles ur
                                   JOIN identity_access.roles r ON r.role_id = ur.role_id
                                   WHERE ur.user_id = u.user_id AND r.code = 'ADMIN' AND r.is_active = 1
                               ) THEN 1 ELSE 0 END AS is_admin
                        FROM identity_access.users u
                        WHERE u.email = ? AND u.is_active = 1 AND EXISTS (
                            SELECT 1 FROM identity_access.user_roles ur
                            JOIN identity_access.roles r ON r.role_id = ur.role_id
                            WHERE ur.user_id = u.user_id AND r.code IN ('ADMIN', 'MANAGER') AND r.is_active = 1
                        )
                        """,
                (rs, row) ->
                        new Manager(
                                rs.getLong("user_id"),
                                rs.getString("full_name"),
                                rs.getBoolean("is_admin")),
                email);
    }

    public List<IssueState> findActiveIssue(Long id) {
        return jdbc.query(
                """
                        SELECT i.issue_id, rt.hotel_id, i.status, i.assigned_staff_id
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
                                rs.getString("status"),
                                rs.getObject("assigned_staff_id", Long.class)),
                id);
    }

    public Integer countMembership(Long managerId, Long hotelId) {
        return jdbc.queryForObject(
                """
                        SELECT COUNT(*) FROM identity_access.staff
                        WHERE user_id = ? AND hotel_id = ? AND is_active = 1
                        """,
                Integer.class,
                managerId,
                hotelId);
    }

    public List<IssueAssigneeResponse> findEligibleStaff(Long hotelId) {
        return jdbc.query(
                """
                SELECT s.staff_id, s.employee_code, u.full_name
                FROM identity_access.staff s
                JOIN identity_access.users u ON u.user_id = s.user_id
                WHERE s.hotel_id = ? AND s.is_active = 1 AND u.is_active = 1 AND EXISTS (
                    SELECT 1 FROM identity_access.user_roles ur
                    JOIN identity_access.roles r ON r.role_id = ur.role_id
                    WHERE ur.user_id = u.user_id AND r.code = 'HOUSEKEEPER' AND r.is_active = 1
                )
                ORDER BY u.full_name, s.staff_id
                """,
                (rs, row) ->
                        new IssueAssigneeResponse(
                                rs.getLong("staff_id"),
                                rs.getString("full_name"),
                                rs.getString("employee_code")),
                hotelId);
    }

    public int assignOpenIssue(Long issueId, Long staffId, Long managerId) {
        return jdbc.update(
                """
                        UPDATE operations.issues
                        SET assigned_staff_id = ?, assigned_by = ?, status = 'ASSIGNED', updated_at = SYSUTCDATETIME()
                        WHERE issue_id = ? AND status = 'OPEN' AND assigned_staff_id IS NULL
                        """,
                staffId,
                managerId,
                issueId);
    }

    public int insertLinkedTask(Long issueId, Long staffId, Long managerId) {
        return jdbc.update(
                """
                INSERT INTO operations.tasks (room_id, issue_id, assigned_staff_id, assigned_by, task_type,
                                              title, description, priority, status, scheduled_at)
                SELECT i.room_id, i.issue_id, ?, ?, 'MAINTENANCE', i.title, i.description, i.priority,
                       'PENDING', SYSUTCDATETIME()
                FROM operations.issues i
                WHERE i.issue_id = ?
                  AND NOT EXISTS (SELECT 1 FROM operations.tasks t WHERE t.issue_id = i.issue_id)
                """,
                staffId,
                managerId,
                issueId);
    }
}
