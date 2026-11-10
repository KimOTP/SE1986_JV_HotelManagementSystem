package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.*;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class MyTaskService {
    private final JdbcTemplate jdbc;
    private final IssueProgressService staffContext;
    public MyTaskService(JdbcTemplate jdbc, IssueProgressService staffContext) {
        this.jdbc = jdbc;
        this.staffContext = staffContext;
    }
    public record TaskState(Long id, Long hotelId, Long assignedStaffId, String status) {}
    private static LocalDateTime date(ResultSet rs, String column) throws SQLException {
        var value = rs.getTimestamp(column);
        return value == null ? null : value.toLocalDateTime();
    }
    public List<MyTaskResponse> getTasks(int page, int size, String room, String status, String type) {
        var staff = staffContext.requireWorker();
        return jdbc.query("""
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
                """, (rs, rowIndex) -> new MyTaskResponse(rs.getLong("task_id"), rs.getString("room_number"),
                rs.getObject("issue_id", Long.class), rs.getString("task_type"), rs.getString("title"),
                rs.getString("description"), rs.getString("priority"), rs.getString("status"),
                date(rs, "scheduled_at"), date(rs, "started_at"), date(rs, "completed_at")),
                staff.staffId(), staff.hotelId(), room.trim(), room.trim(), status, status, type, type, (long) page * size, size);
    }
    private void assertTask(Long id, IssueProgressService.Worker worker, String expectedStatus) {
        var tasks = jdbc.query("""
                SELECT t.task_id, rt.hotel_id, t.assigned_staff_id, t.status
                FROM operations.tasks t
                JOIN inventory.rooms r ON r.room_id = t.room_id
                JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                WHERE t.task_id = ? AND r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                """, (rs, index) -> new TaskState(rs.getLong("task_id"), rs.getLong("hotel_id"),
                rs.getLong("assigned_staff_id"), rs.getString("status")), id);
        if (tasks.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active task not found");
        var task = tasks.getFirst();
        if (!worker.staffId().equals(task.assignedStaffId()) || !worker.hotelId().equals(task.hotelId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Task is not assigned to this staff member");
        }
        if (!expectedStatus.equals(task.status())) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Task state changed; refresh before continuing");
    }
    @Transactional
    public TaskProgressResponse start(Long id) {
        var worker = staffContext.requireWorker();
        var pair = LinkedWorkGuard.forTask(jdbc, id);
        if (pair != null) pair.requireWorker(worker.staffId());
        assertTask(id, worker, "PENDING");
        int changed = jdbc.update("""
                UPDATE operations.tasks
                SET status = 'IN_PROGRESS', started_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                WHERE task_id = ? AND assigned_staff_id = ? AND status = 'PENDING'
                  AND started_at IS NULL AND completed_at IS NULL
                """, id, worker.staffId());
        requireChanged(changed);
        // Keep the linked issue in sync (ASSIGNED -> IN_PROGRESS); no-op if already moved.
        int linkedChanged = jdbc.update("""
                UPDATE i SET i.status = 'IN_PROGRESS', i.updated_at = SYSUTCDATETIME()
                FROM operations.issues i
                JOIN operations.tasks t ON t.issue_id = i.issue_id
                WHERE t.task_id = ? AND i.assigned_staff_id = t.assigned_staff_id AND i.status = 'ASSIGNED'
                """, id);
        if (pair != null) requireChanged(linkedChanged);
        return new TaskProgressResponse(id, "IN_PROGRESS");
    }
    @Transactional
    public TaskProgressResponse complete(Long id) {
        var worker = staffContext.requireWorker();
        var pair = LinkedWorkGuard.forTask(jdbc, id);
        if (pair != null) pair.requireWorker(worker.staffId());
        assertTask(id, worker, "IN_PROGRESS");
        int changed = jdbc.update("""
                UPDATE operations.tasks
                SET status = 'COMPLETED', completed_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                WHERE task_id = ? AND assigned_staff_id = ? AND status = 'IN_PROGRESS'
                  AND started_at IS NOT NULL AND completed_at IS NULL
                """, id, worker.staffId());
        requireChanged(changed);
        // Keep the linked issue in sync (-> RESOLVED); no-op if already resolved.
        int linkedChanged = jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
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
        if (pair != null) requireChanged(linkedChanged);
        return new TaskProgressResponse(id, "COMPLETED");
    }
    private void requireChanged(int changed) {
        if (changed != 1) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Task changed concurrently or timestamps are inconsistent; refresh the list");
    }
}
