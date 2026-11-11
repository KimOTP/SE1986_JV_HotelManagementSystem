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
public class MyTaskRepository {
    private final JdbcTemplate jdbc;

    public MyTaskRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record TaskState(Long id, Long hotelId, Long assignedStaffId, String status) {}

    public List<MyTaskResponse> findTasks(
            Long staffId,
            Long hotelId,
            int page,
            int size,
            String room,
            String status,
            String type) {
        return jdbc.query(
                """
                SELECT t.task_id, r.room_number, t.issue_id, t.task_type, t.title, t.description,
                       t.priority, t.status, t.scheduled_at, t.started_at, t.completed_at
                FROM operations.tasks t
                JOIN inventory.rooms r ON r.room_id = t.room_id
                JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                WHERE t.assigned_staff_id = ? AND rt.hotel_id = ?
                  AND r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                  AND (? = '' OR CHARINDEX(?, r.room_number) > 0)
                  AND (? = '' OR t.status = ?) AND (? = '' OR t.task_type = ?)
                ORDER BY t.scheduled_at, t.task_id
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """,
                (rs, rowIndex) ->
                        new MyTaskResponse(
                                rs.getLong("task_id"),
                                rs.getString("room_number"),
                                rs.getObject("issue_id", Long.class),
                                rs.getString("task_type"),
                                rs.getString("title"),
                                rs.getString("description"),
                                rs.getString("priority"),
                                rs.getString("status"),
                                date(rs, "scheduled_at"),
                                date(rs, "started_at"),
                                date(rs, "completed_at")),
                staffId,
                hotelId,
                room.trim(),
                room.trim(),
                status,
                status,
                type,
                type,
                (long) page * size,
                size);
    }

    public List<TaskState> findActiveTask(Long id) {
        return jdbc.query(
                """
                        SELECT t.task_id, rt.hotel_id, t.assigned_staff_id, t.status
                        FROM operations.tasks t
                        JOIN inventory.rooms r ON r.room_id = t.room_id
                        JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                        JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                        WHERE t.task_id = ? AND r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                        """,
                (rs, index) ->
                        new TaskState(
                                rs.getLong("task_id"),
                                rs.getLong("hotel_id"),
                                rs.getLong("assigned_staff_id"),
                                rs.getString("status")),
                id);
    }

    public int startTask(Long id, Long staffId) {
        return jdbc.update(
                """
                        UPDATE operations.tasks
                        SET status = 'IN_PROGRESS', started_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                        WHERE task_id = ? AND assigned_staff_id = ? AND status = 'PENDING'
                          AND started_at IS NULL AND completed_at IS NULL
                        """,
                id,
                staffId);
    }

    public int startLinkedIssue(Long id) {
        return jdbc.update(
                """
                        UPDATE i SET i.status = 'IN_PROGRESS', i.updated_at = SYSUTCDATETIME()
                        FROM operations.issues i
                        JOIN operations.tasks t ON t.issue_id = i.issue_id
                        WHERE t.task_id = ? AND i.assigned_staff_id = t.assigned_staff_id AND i.status = 'ASSIGNED'
                        """,
                id);
    }

    public int completeTask(Long id, Long staffId) {
        return jdbc.update(
                """
                        UPDATE operations.tasks
                        SET status = 'COMPLETED', completed_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                        WHERE task_id = ? AND assigned_staff_id = ? AND status = 'IN_PROGRESS'
                          AND started_at IS NOT NULL AND completed_at IS NULL
                        """,
                id,
                staffId);
    }

    public int resolveLinkedIssue(Long id) {
        return jdbc.update(
                connection -> {
                    var statement =
                            connection.prepareStatement(
                                    """
                                            UPDATE i SET i.status = 'RESOLVED', i.resolved_at = SYSUTCDATETIME(),
                                                         i.resolution_note = COALESCE(i.resolution_note, ?),
                                                         i.updated_at = SYSUTCDATETIME()
                                            FROM operations.issues i
                                            JOIN operations.tasks t ON t.issue_id = i.issue_id
                                            WHERE t.task_id = ? AND i.assigned_staff_id = t.assigned_staff_id AND i.status = 'IN_PROGRESS'
                                            """);
                    statement.setNString(1, "Nhân viên đã hoàn thành công việc được giao.");
                    statement.setLong(2, id);
                    return statement;
                });
    }

    private static LocalDateTime date(ResultSet rs, String column) throws SQLException {
        var value = rs.getTimestamp(column);
        return value == null ? null : value.toLocalDateTime();
    }
}
