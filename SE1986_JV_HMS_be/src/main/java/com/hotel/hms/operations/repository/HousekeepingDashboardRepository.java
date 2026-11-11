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
public class HousekeepingDashboardRepository {
    private final JdbcTemplate jdbc;

    public HousekeepingDashboardRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Summary summary(
            boolean allTime,
            LocalDateTime fromUtc,
            LocalDateTime toUtc,
            int admin,
            Long managerId) {
        var from = Timestamp.valueOf(fromUtc);
        var to = Timestamp.valueOf(toUtc);
        return jdbc.queryForObject(
                SCOPED_TASKS
                        + """
                SELECT COUNT_BIG(*) AS total,
                    COALESCE(SUM(CAST(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END AS BIGINT)),0) AS pending,
                    COALESCE(SUM(CAST(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END AS BIGINT)),0) AS in_progress,
                    COALESCE(SUM(CAST(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END AS BIGINT)),0) AS completed,
                    COALESCE(SUM(CAST(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END AS BIGINT)),0) AS cancelled,
                    COALESCE(SUM(CAST(CASE WHEN status IN ('PENDING','IN_PROGRESS') AND priority IN ('HIGH','URGENT') THEN 1 ELSE 0 END AS BIGINT)),0) AS high_priority,
                    COALESCE(SUM(CAST(CASE WHEN status IN ('PENDING','IN_PROGRESS') AND scheduled_at < SYSUTCDATETIME() THEN 1 ELSE 0 END AS BIGINT)),0) AS overdue
                FROM scoped_tasks
                """,
                (rs, index) ->
                        new Summary(
                                rs.getLong("total"),
                                rs.getLong("pending"),
                                rs.getLong("in_progress"),
                                rs.getLong("completed"),
                                rs.getLong("cancelled"),
                                rs.getLong("high_priority"),
                                rs.getLong("overdue")),
                allTime ? 1 : 0,
                from,
                to,
                admin,
                managerId);
    }

    public List<Workload> workload(
            boolean allTime,
            LocalDateTime fromUtc,
            LocalDateTime toUtc,
            int admin,
            Long managerId) {
        var from = Timestamp.valueOf(fromUtc);
        var to = Timestamp.valueOf(toUtc);
        return jdbc.query(
                SCOPED_TASKS
                        + """
                SELECT s.staff_id, s.employee_code, u.full_name, h.name AS hotel_name,
                    CASE WHEN %s THEN 1 ELSE 0 END AS active_staff,
                    SUM(CAST(CASE WHEN t.status = 'PENDING' THEN 1 ELSE 0 END AS BIGINT)) AS pending,
                    SUM(CAST(CASE WHEN t.status = 'IN_PROGRESS' THEN 1 ELSE 0 END AS BIGINT)) AS in_progress,
                    SUM(CAST(CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END AS BIGINT)) AS completed,
                    SUM(CAST(CASE WHEN t.status = 'CANCELLED' THEN 1 ELSE 0 END AS BIGINT)) AS cancelled
                FROM identity_access.staff s
                JOIN identity_access.users u ON u.user_id = s.user_id
                JOIN identity_access.hotels h ON h.hotel_id = s.hotel_id
                LEFT JOIN scoped_tasks t ON t.assigned_staff_id = s.staff_id
                WHERE h.is_active = 1 AND ((%s) OR t.task_id IS NOT NULL)
                  AND (? = 1 OR EXISTS (SELECT 1 FROM identity_access.staff ms
                       WHERE ms.user_id = ? AND ms.hotel_id = s.hotel_id AND ms.is_active = 1))
                GROUP BY s.staff_id, s.employee_code, s.is_active, u.user_id, u.full_name, u.is_active, h.name
                ORDER BY in_progress DESC, pending DESC, s.staff_id
                """
                                .formatted(ACTIVE_STAFF, ACTIVE_STAFF),
                (rs, index) ->
                        new Workload(
                                rs.getLong("staff_id"),
                                rs.getString("full_name"),
                                rs.getString("employee_code"),
                                rs.getString("hotel_name"),
                                rs.getBoolean("active_staff"),
                                rs.getLong("pending"),
                                rs.getLong("in_progress"),
                                rs.getLong("completed"),
                                rs.getLong("cancelled")),
                allTime ? 1 : 0,
                from,
                to,
                admin,
                managerId,
                admin,
                managerId);
    }

    public List<UrgentTask> urgent(
            boolean allTime,
            LocalDateTime fromUtc,
            LocalDateTime toUtc,
            int admin,
            Long managerId) {
        var from = Timestamp.valueOf(fromUtc);
        var to = Timestamp.valueOf(toUtc);
        return jdbc.query(
                SCOPED_TASKS
                        + """
                SELECT TOP (5) t.task_id, r.room_number, t.title, t.priority, t.status, u.full_name, t.scheduled_at
                FROM scoped_tasks t
                JOIN inventory.rooms r ON r.room_id = t.room_id
                JOIN identity_access.staff s ON s.staff_id = t.assigned_staff_id
                JOIN identity_access.users u ON u.user_id = s.user_id
                WHERE t.status IN ('PENDING','IN_PROGRESS') AND t.priority IN ('HIGH','URGENT')
                ORDER BY CASE WHEN t.priority = 'URGENT' THEN 0 ELSE 1 END, t.scheduled_at, t.task_id
                """,
                (rs, index) ->
                        new UrgentTask(
                                rs.getLong("task_id"),
                                rs.getString("room_number"),
                                rs.getString("title"),
                                rs.getString("priority"),
                                rs.getString("status"),
                                rs.getString("full_name"),
                                rs.getTimestamp("scheduled_at").toLocalDateTime()),
                allTime ? 1 : 0,
                from,
                to,
                admin,
                managerId);
    }

    public List<OpenIssue> openIssues(int admin, Long managerId) {
        return jdbc.query(
                """
                        SELECT TOP (5) i.issue_id, r.room_number, i.title, i.status
                        FROM operations.issues i
                        JOIN inventory.rooms r ON r.room_id = i.room_id
                        JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                        JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                        WHERE i.status IN ('OPEN','ASSIGNED','IN_PROGRESS')
                          AND r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                          AND (? = 1 OR EXISTS (SELECT 1 FROM identity_access.staff ms
                               WHERE ms.user_id = ? AND ms.hotel_id = rt.hotel_id AND ms.is_active = 1))
                        ORDER BY i.created_at DESC, i.issue_id DESC
                        """,
                (rs, index) ->
                        new OpenIssue(
                                rs.getLong("issue_id"),
                                rs.getString("room_number"),
                                rs.getString("title"),
                                rs.getString("status")),
                admin,
                managerId);
    }

    private static final String SCOPED_TASKS =
            """
            WITH scoped_tasks AS (
                SELECT t.* FROM operations.tasks t
                JOIN inventory.rooms r ON r.room_id = t.room_id
                JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                WHERE (? = 1 OR (t.scheduled_at >= ? AND t.scheduled_at < ?))
                  AND r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                  AND (? = 1 OR EXISTS (SELECT 1 FROM identity_access.staff ms
                       WHERE ms.user_id = ? AND ms.hotel_id = rt.hotel_id AND ms.is_active = 1))
            )
            """;
    private static final String ACTIVE_STAFF =
            """
            s.is_active = 1 AND u.is_active = 1 AND EXISTS (
                SELECT 1 FROM identity_access.user_roles ur JOIN identity_access.roles staff_role ON staff_role.role_id = ur.role_id
                WHERE ur.user_id = u.user_id AND staff_role.code = 'HOUSEKEEPER' AND staff_role.is_active = 1)
            """;
}
