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
public class OperationsFollowUpRepository {
    private final JdbcTemplate jdbc;

    public OperationsFollowUpRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Work(Long id, Long hotelId, Long staffId, String status, String version) {}

    public List<Work> findWork(boolean issue, Long id, boolean lock) {
        return jdbc.query(
                "SELECT w."
                        + idColumn(issue)
                        + " AS id, rt.hotel_id,w.assigned_staff_id,w.status,CONVERT(varchar(18),CONVERT(varbinary(8),w.row_version),1) AS version FROM "
                        + tableName(issue)
                        + " w "
                        + (lock ? "WITH (UPDLOCK,HOLDLOCK) " : "")
                        + "JOIN inventory.rooms r ON r.room_id=w.room_id JOIN inventory.room_types rt ON rt.room_type_id=r.room_type_id WHERE w."
                        + idColumn(issue)
                        + "=?",
                (rs, i) ->
                        new Work(
                                rs.getLong("id"),
                                rs.getLong("hotel_id"),
                                rs.getObject("assigned_staff_id", Long.class),
                                rs.getString("status"),
                                rs.getString("version")),
                id);
    }

    public List<Map<String, Object>> findStaff(Long hotelId) {
        return jdbc.queryForList(
                """
                        SELECT s.staff_id AS id,u.full_name AS fullName FROM identity_access.staff s
                        JOIN identity_access.users u ON u.user_id=s.user_id
                        WHERE s.hotel_id=? AND s.is_active=1 AND u.is_active=1 AND EXISTS (
                          SELECT 1 FROM identity_access.user_roles ur JOIN identity_access.roles r ON r.role_id=ur.role_id
                          WHERE ur.user_id=u.user_id AND r.code='HOUSEKEEPER' AND r.is_active=1)
                        ORDER BY u.full_name,s.staff_id
                        """,
                hotelId);
    }

    public List<Map<String, Object>> findHistory(boolean issue, Long id) {
        return jdbc.queryForList(
                """
                        SELECT h.action,h.reason,h.previous_status AS previousStatus,h.new_status AS newStatus,
                          oldUser.full_name AS previousStaff,newUser.full_name AS newStaff,u.full_name AS actor,
                          CONVERT(varchar(30),h.created_at,126)+'Z' AS createdAt
                        FROM operations.work_history h JOIN identity_access.users u ON u.user_id=h.actor_id
                        LEFT JOIN identity_access.staff oldStaff ON oldStaff.staff_id=h.previous_staff_id
                        LEFT JOIN identity_access.users oldUser ON oldUser.user_id=oldStaff.user_id
                        LEFT JOIN identity_access.staff newStaff ON newStaff.staff_id=h.new_staff_id
                        LEFT JOIN identity_access.users newUser ON newUser.user_id=newStaff.user_id
                        WHERE h.work_type=? AND h.work_id=? ORDER BY h.history_id DESC
                        """,
                issue ? "ISSUE" : "TASK",
                id);
    }

    public Integer countEligibleStaff(Long staffId, Long hotelId) {
        return jdbc.queryForObject(
                """
                            SELECT COUNT(*) FROM identity_access.staff s JOIN identity_access.users u ON u.user_id=s.user_id
                            WHERE s.staff_id=? AND s.hotel_id=? AND s.is_active=1 AND u.is_active=1 AND EXISTS (
                              SELECT 1 FROM identity_access.user_roles ur JOIN identity_access.roles r ON r.role_id=ur.role_id
                              WHERE ur.user_id=u.user_id AND r.code='HOUSEKEEPER' AND r.is_active=1)
                            """,
                Integer.class,
                staffId,
                hotelId);
    }

    public int updateWork(
            boolean issue,
            Long id,
            boolean cancel,
            Long nextStaffId,
            Long managerId,
            String nextStatus,
            String version) {
        return jdbc.update(
                "UPDATE "
                        + tableName(issue)
                        + " SET assigned_staff_id=?, "
                        + (cancel ? "" : "assigned_by=?, ")
                        + "status=?, updated_at=SYSUTCDATETIME() WHERE "
                        + idColumn(issue)
                        + "=? AND row_version=CONVERT(varbinary(8),?,1)",
                cancel
                        ? new Object[] {nextStaffId, nextStatus, id, version}
                        : new Object[] {nextStaffId, managerId, nextStatus, id, version});
    }

    public int updateLinkedWork(
            boolean linkedIsIssue,
            Long nextStaffId,
            Long managerId,
            Long linkedId,
            Long previousStaffId,
            String previousStatus) {
        return jdbc.update(
                "UPDATE "
                        + tableName(linkedIsIssue)
                        + " SET assigned_staff_id=?,assigned_by=?,updated_at=SYSUTCDATETIME() WHERE "
                        + idColumn(linkedIsIssue)
                        + "=? AND assigned_staff_id=? AND status=?",
                nextStaffId,
                managerId,
                linkedId,
                previousStaffId,
                previousStatus);
    }

    public int insertHistory(
            boolean issue,
            Long id,
            String action,
            Long actor,
            Long previousStaff,
            Long nextStaffId,
            String previousStatus,
            String nextStatus,
            String reason) {
        return jdbc.update(
                "INSERT operations.work_history(work_type,work_id,action,actor_id,previous_staff_id,new_staff_id,previous_status,new_status,reason) VALUES(?,?,?,?,?,?,?,?,?)",
                issue ? "ISSUE" : "TASK",
                id,
                action,
                actor,
                previousStaff,
                nextStaffId,
                previousStatus,
                nextStatus,
                reason);
    }

    public List<Map<String, Object>> findOwnReports(Long userId, int page, int size) {
        return jdbc.queryForList(
                """
                SELECT i.issue_id AS id,r.room_number AS roomNumber,i.title,i.status,i.description,
                  i.resolution_note AS resolutionNote,CONVERT(varchar(30),i.created_at,126)+'Z' AS createdAt
                FROM operations.issues i JOIN inventory.rooms r ON r.room_id=i.room_id
                WHERE i.reported_by=? ORDER BY i.created_at DESC,i.issue_id DESC
                OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """,
                userId,
                (long) page * size,
                size);
    }

    private String tableName(boolean issue) {
        return issue ? "operations.issues" : "operations.tasks";
    }

    private String idColumn(boolean issue) {
        return issue ? "issue_id" : "task_id";
    }
}
