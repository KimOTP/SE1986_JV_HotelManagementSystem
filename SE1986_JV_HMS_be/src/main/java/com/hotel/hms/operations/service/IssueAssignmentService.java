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
public class IssueAssignmentService {
    private final JdbcTemplate jdbc;
    private final Environment environment;
    public IssueAssignmentService(JdbcTemplate jdbc, Environment environment) {
        this.jdbc = jdbc;
        this.environment = environment;
    }
    public record Manager(Long id, String name, boolean admin) {}
    public record IssueState(Long id, Long hotelId, String status, Long assignedStaffId) {}

    private Manager configuredManager() {
        if (!environment.acceptsProfiles(Profiles.of("local-demo"))) return null;
        String email = environment.getProperty("operations.demo-manager-email", "").trim();
        if (email.isEmpty()) return null;
        var managers = jdbc.query("""
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
                """, (rs, row) -> new Manager(rs.getLong("user_id"), rs.getString("full_name"), rs.getBoolean("is_admin")), email);
        return managers.isEmpty() ? null : managers.getFirst();
    }
    private Manager requireManager() {
        Manager manager = configuredManager();
        if (manager == null) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Configure an active local-demo manager before assigning issues");
        return manager;
    }
    private IssueState requireOpenIssue(Long id) {
        var issues = jdbc.query("""
                SELECT i.issue_id, rt.hotel_id, i.status, i.assigned_staff_id
                FROM operations.issues i
                JOIN inventory.rooms r ON r.room_id = i.room_id
                JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                WHERE i.issue_id = ? AND r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                """, (rs, row) -> new IssueState(rs.getLong("issue_id"), rs.getLong("hotel_id"),
                rs.getString("status"), rs.getObject("assigned_staff_id", Long.class)), id);
        if (issues.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active issue not found");
        var issue = issues.getFirst();
        if (!"OPEN".equals(issue.status()) || issue.assignedStaffId() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Issue is no longer open and unassigned");
        }
        return issue;
    }
    private void assertScope(Manager manager, Long hotelId) {
        if (manager.admin()) return;
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM identity_access.staff
                WHERE user_id = ? AND hotel_id = ? AND is_active = 1
                """, Integer.class, manager.id(), hotelId);
        if (count == null || count == 0) throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Manager cannot assign issues in this hotel");
    }
    @Transactional(readOnly = true)
    public IssueAssignmentContext getContext() {
        var manager = configuredManager();
        return manager == null
                ? new IssueAssignmentContext(false, null, "Chưa bật local-demo hoặc manager cấu hình không có vai trò ADMIN/MANAGER đang hoạt động.")
                : new IssueAssignmentContext(true, manager.name(), "Phân công thử nghiệm dưới danh tính cấu hình tại backend, chưa phải phiên JWT.");
    }
    public List<IssueAssigneeResponse> getAssignees(Long issueId) {
        var manager = requireManager();
        var issue = requireOpenIssue(issueId);
        assertScope(manager, issue.hotelId());
        return eligibleStaff(issue.hotelId());
    }
    private List<IssueAssigneeResponse> eligibleStaff(Long hotelId) {
        return jdbc.query("""
                SELECT s.staff_id, s.employee_code, u.full_name
                FROM identity_access.staff s
                JOIN identity_access.users u ON u.user_id = s.user_id
                WHERE s.hotel_id = ? AND s.is_active = 1 AND u.is_active = 1 AND EXISTS (
                    SELECT 1 FROM identity_access.user_roles ur
                    JOIN identity_access.roles r ON r.role_id = ur.role_id
                    WHERE ur.user_id = u.user_id AND r.code = 'STAFF' AND r.is_active = 1
                )
                ORDER BY u.full_name, s.staff_id
                """, (rs, row) -> new IssueAssigneeResponse(rs.getLong("staff_id"),
                rs.getString("full_name"), rs.getString("employee_code")), hotelId);
    }
    @Transactional
    public IssueAssignmentResponse assign(Long issueId, AssignIssueRequest request) {
        var manager = requireManager();
        var issue = requireOpenIssue(issueId);
        assertScope(manager, issue.hotelId());
        if (eligibleStaff(issue.hotelId()).stream().noneMatch(staff -> staff.id().equals(request.staffId()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Staff must be active and belong to the issue hotel");
        }
        // Conditional write: only one concurrent assignment may move OPEN -> ASSIGNED.
        int changed = jdbc.update("""
                UPDATE operations.issues
                SET assigned_staff_id = ?, assigned_by = ?, status = 'ASSIGNED', updated_at = SYSUTCDATETIME()
                WHERE issue_id = ? AND status = 'OPEN' AND assigned_staff_id IS NULL
                """, request.staffId(), manager.id(), issueId);
        if (changed != 1) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Issue changed concurrently; refresh before assigning again");
        return new IssueAssignmentResponse(issueId, request.staffId(), manager.id(), "ASSIGNED");
    }
}
