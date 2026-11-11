package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.repository.IssueAssignmentRepository;
import com.hotel.hms.operations.repository.IssueAssignmentRepository.*;
import com.hotel.hms.operations.security.OperationsIdentity;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class IssueAssignmentService {
    private final IssueAssignmentRepository persistence;
    private final OperationsIdentity identity;

    public IssueAssignmentService(
            IssueAssignmentRepository persistence, OperationsIdentity identity) {
        this.persistence = persistence;
        this.identity = identity;
    }

    private Manager currentManager() {
        String email = identity.email();
        var managers = persistence.findManagers(email);
        return managers.isEmpty() ? null : managers.getFirst();
    }

    // Identity comes from the verified JWT; hotel membership is checked in SQL.
    public Manager requireManager() {
        Manager manager = currentManager();
        if (manager == null)
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản hiện tại cần vai trò ADMIN hoặc MANAGER đang hoạt động.");
        return manager;
    }

    private IssueState requireOpenIssue(Long id) {
        var issues = persistence.findActiveIssue(id);
        if (issues.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active issue not found");
        var issue = issues.getFirst();
        if (!"OPEN".equals(issue.status()) || issue.assignedStaffId() != null) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Issue is no longer open and unassigned");
        }
        return issue;
    }

    public void assertScope(Manager manager, Long hotelId) {
        if (manager.admin()) return;
        Integer count = persistence.countMembership(manager.id(), hotelId);
        if (count == null || count == 0)
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Manager cannot assign issues in this hotel");
    }

    @Transactional(readOnly = true)
    public IssueAssignmentContext getContext() {
        var manager = currentManager();
        return manager == null
                ? new IssueAssignmentContext(
                        false,
                        null,
                        "Tài khoản hiện tại không có vai trò ADMIN/MANAGER đang hoạt động.")
                : new IssueAssignmentContext(
                        true, manager.name(), "Phân công bằng tài khoản đang đăng nhập.");
    }

    public List<IssueAssigneeResponse> getAssignees(Long issueId) {
        var manager = requireManager();
        var issue = requireOpenIssue(issueId);
        assertScope(manager, issue.hotelId());
        return eligibleStaff(issue.hotelId());
    }

    private List<IssueAssigneeResponse> eligibleStaff(Long hotelId) {
        return persistence.findEligibleStaff(hotelId);
    }

    @Transactional
    public IssueAssignmentResponse assign(Long issueId, AssignIssueRequest request) {
        var manager = requireManager();
        var issue = requireOpenIssue(issueId);
        assertScope(manager, issue.hotelId());
        if (eligibleStaff(issue.hotelId()).stream()
                .noneMatch(staff -> staff.id().equals(request.staffId()))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Staff must be active and belong to the issue hotel");
        }
        // Conditional write: only one concurrent assignment may move OPEN -> ASSIGNED.
        int changed = persistence.assignOpenIssue(issueId, request.staffId(), manager.id());
        if (changed != 1)
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Issue changed concurrently; refresh before assigning again");
        // Housekeeper's "Công việc của tôi" reads operations.tasks, so every assignment
        // must produce a linked task (one per issue).
        persistence.insertLinkedTask(issueId, request.staffId(), manager.id());
        return new IssueAssignmentResponse(issueId, request.staffId(), manager.id(), "ASSIGNED");
    }
}
