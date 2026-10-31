package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.*;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class IssueProgressService {
    private final JdbcTemplate jdbc;
    private final Environment environment;
    public IssueProgressService(JdbcTemplate jdbc, Environment environment) {
        this.jdbc = jdbc;
        this.environment = environment;
    }
    public record Worker(Long staffId, Long hotelId, String name) {}
    public record IssueState(Long id, Long hotelId, Long assignedStaffId, String status) {}

    private Worker configuredWorker() {
        if (!environment.acceptsProfiles(Profiles.of("local-demo"))) return null;
        String email = environment.getProperty("operations.demo-staff-email", "").trim();
        if (email.isEmpty()) return null;
        var workers = jdbc.query("""
                SELECT s.staff_id, s.hotel_id, u.full_name
                FROM identity_access.staff s
                JOIN identity_access.users u ON u.user_id = s.user_id
                JOIN identity_access.hotels h ON h.hotel_id = s.hotel_id
                WHERE u.email = ? AND s.is_active = 1 AND u.is_active = 1 AND h.is_active = 1
                  AND EXISTS (
                      SELECT 1 FROM identity_access.user_roles ur
                      JOIN identity_access.roles r ON r.role_id = ur.role_id
                      WHERE ur.user_id = u.user_id AND r.code = 'STAFF' AND r.is_active = 1
                  )
                """, (rs, row) -> new Worker(rs.getLong("staff_id"), rs.getLong("hotel_id"), rs.getString("full_name")), email);
        return workers.isEmpty() ? null : workers.getFirst();
    }
    public IssueWorkContext getContext() {
        var worker = configuredWorker();
        return worker == null
                ? new IssueWorkContext(false, null, null, "Chưa bật local-demo hoặc staff cấu hình không hoạt động/không có vai trò STAFF.")
                : new IssueWorkContext(true, worker.staffId(), worker.name(), "Xử lý sự cố bằng nhân viên cấu hình tại backend, chưa phải phiên JWT.");
    }
    private Worker requireWorker() {
        var worker = configuredWorker();
        if (worker == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Configure an active local-demo staff member before updating issue progress");
        return worker;
    }
    private void assertAssignedIssue(Long issueId, Worker worker, String expectedStatus) {
        List<IssueState> issues = jdbc.query("""
                SELECT i.issue_id, rt.hotel_id, i.assigned_staff_id, i.status
                FROM operations.issues i
                JOIN inventory.rooms r ON r.room_id = i.room_id
                JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                WHERE i.issue_id = ? AND r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                """, (rs, row) -> new IssueState(rs.getLong("issue_id"), rs.getLong("hotel_id"),
                rs.getObject("assigned_staff_id", Long.class), rs.getString("status")), issueId);
        if (issues.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active issue not found");
        var issue = issues.getFirst();
        if (!worker.hotelId().equals(issue.hotelId()) || !worker.staffId().equals(issue.assignedStaffId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the assigned staff member may update this issue");
        }
        if (!expectedStatus.equals(issue.status())) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Issue is not in the required state; refresh before continuing");
    }
    @Transactional
    public IssueProgressResponse start(Long issueId) {
        var worker = requireWorker();
        assertAssignedIssue(issueId, worker, "ASSIGNED");
        int changed = jdbc.update("""
                UPDATE operations.issues
                SET status = 'IN_PROGRESS', updated_at = SYSUTCDATETIME()
                WHERE issue_id = ? AND assigned_staff_id = ? AND status = 'ASSIGNED'
                """, issueId, worker.staffId());
        requireChanged(changed);
        return new IssueProgressResponse(issueId, "IN_PROGRESS");
    }
    @Transactional
    public IssueProgressResponse resolve(Long issueId, ResolveIssueRequest request) {
        var worker = requireWorker();
        assertAssignedIssue(issueId, worker, "IN_PROGRESS");
        // Unicode note is bound explicitly, not concatenated into SQL.
        int changed = jdbc.update(connection -> {
            var statement = connection.prepareStatement("""
                    UPDATE operations.issues
                    SET status = 'RESOLVED', resolution_note = ?, resolved_at = SYSUTCDATETIME(), updated_at = SYSUTCDATETIME()
                    WHERE issue_id = ? AND assigned_staff_id = ? AND status = 'IN_PROGRESS'
                    """);
            statement.setNString(1, request.resolutionNote());
            statement.setLong(2, issueId);
            statement.setLong(3, worker.staffId());
            return statement;
        });
        requireChanged(changed);
        return new IssueProgressResponse(issueId, "RESOLVED");
    }
    private void requireChanged(int changed) {
        if (changed != 1) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Issue changed concurrently; refresh before updating again");
    }
}
