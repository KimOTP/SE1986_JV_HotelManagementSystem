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
public class TaskManagementRepository {
    private final JdbcTemplate jdbc;

    public TaskManagementRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record RoomState(Long id, Long hotelId) {}

    public List<RoomState> findActiveRoom(Long id) {
        return jdbc.query(
                """
                        SELECT r.room_id, rt.hotel_id FROM inventory.rooms r
                        JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                        JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                        WHERE r.room_id = ? AND r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                        """,
                (rs, index) -> new RoomState(rs.getLong("room_id"), rs.getLong("hotel_id")),
                id);
    }

    public List<TaskRoomResponse> findRooms(int admin, Long managerId) {
        return jdbc.query(
                """
                SELECT r.room_id, r.room_number, h.name AS hotel_name
                FROM inventory.rooms r
                JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                WHERE r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                  AND (? = 1 OR EXISTS (SELECT 1 FROM identity_access.staff ms
                       WHERE ms.user_id = ? AND ms.hotel_id = rt.hotel_id AND ms.is_active = 1))
                ORDER BY h.hotel_id, r.room_number, r.room_id
                """,
                (rs, row) ->
                        new TaskRoomResponse(
                                rs.getLong("room_id"),
                                rs.getString("room_number"),
                                rs.getString("hotel_name")),
                admin,
                managerId);
    }

    public List<IssueAssigneeResponse> findStaff(Long hotelId) {
        return jdbc.query(
                """
                SELECT s.staff_id, s.employee_code, u.full_name
                FROM identity_access.staff s JOIN identity_access.users u ON u.user_id = s.user_id
                WHERE s.hotel_id = ? AND s.is_active = 1 AND u.is_active = 1 AND EXISTS (
                    SELECT 1 FROM identity_access.user_roles ur
                    JOIN identity_access.roles r ON r.role_id = ur.role_id
                    WHERE ur.user_id = u.user_id AND r.code = 'HOUSEKEEPER' AND r.is_active = 1)
                ORDER BY u.full_name, s.staff_id
                """,
                (rs, row) ->
                        new IssueAssigneeResponse(
                                rs.getLong("staff_id"),
                                rs.getString("full_name"),
                                rs.getString("employee_code")),
                hotelId);
    }

    public List<ManagedTaskResponse> findTasks(
            int admin,
            Long managerId,
            int page,
            int size,
            String room,
            String status,
            String type) {
        return jdbc.query(
                """
                SELECT t.task_id, r.room_number, h.name AS hotel_name, t.task_type, t.title, t.description,
                       t.priority, t.status, s.staff_id, u.full_name AS assigned_to,
                       creator.full_name AS assigned_by, t.scheduled_at
                FROM operations.tasks t
                JOIN inventory.rooms r ON r.room_id = t.room_id
                JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                JOIN identity_access.staff s ON s.staff_id = t.assigned_staff_id
                JOIN identity_access.users u ON u.user_id = s.user_id
                JOIN identity_access.users creator ON creator.user_id = t.assigned_by
                WHERE r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                  AND (? = 1 OR EXISTS (SELECT 1 FROM identity_access.staff ms
                       WHERE ms.user_id = ? AND ms.hotel_id = rt.hotel_id AND ms.is_active = 1))
                  AND (? = '' OR CHARINDEX(?, r.room_number) > 0)
                  AND (? = '' OR t.status = ?) AND (? = '' OR t.task_type = ?)
                ORDER BY t.created_at DESC, t.task_id DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """,
                (rs, index) ->
                        new ManagedTaskResponse(
                                rs.getLong("task_id"),
                                rs.getString("room_number"),
                                rs.getString("hotel_name"),
                                rs.getString("task_type"),
                                rs.getString("title"),
                                rs.getString("description"),
                                rs.getString("priority"),
                                rs.getString("status"),
                                rs.getLong("staff_id"),
                                rs.getString("assigned_to"),
                                rs.getString("assigned_by"),
                                rs.getTimestamp("scheduled_at").toLocalDateTime()),
                admin,
                managerId,
                room.trim(),
                room.trim(),
                status,
                status,
                type,
                type,
                (long) page * size,
                size);
    }

    public Long insert(CreateTaskRequest request, Long actorId) {
        var keyHolder = new GeneratedKeyHolder();
        jdbc.update(
                connection -> {
                    var statement =
                            connection.prepareStatement(
                                    """
                                    INSERT INTO operations.tasks
                                    (room_id, assigned_staff_id, assigned_by, task_type, title, description, priority, status, scheduled_at)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
                                    """,
                                    Statement.RETURN_GENERATED_KEYS);
                    statement.setLong(1, request.roomId());
                    statement.setLong(2, request.staffId());
                    statement.setLong(3, actorId);
                    statement.setString(4, request.taskType());
                    statement.setNString(5, request.title());
                    statement.setNString(6, request.description());
                    statement.setString(7, request.priority());
                    statement.setTimestamp(8, Timestamp.valueOf(request.scheduledAt()));
                    return statement;
                },
                keyHolder);
        Number id = keyHolder.getKey();
        if (id == null) throw new IllegalStateException("Database did not return task ID");
        return id.longValue();
    }
}
