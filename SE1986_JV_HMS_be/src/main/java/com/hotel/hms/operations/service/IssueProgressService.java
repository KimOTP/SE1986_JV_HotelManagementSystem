package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.repository.IssueProgressRepository;
import com.hotel.hms.operations.repository.IssueProgressRepository.*;
import com.hotel.hms.operations.repository.LinkedWorkRepository;
import com.hotel.hms.operations.security.OperationsIdentity;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class IssueProgressService {
    private final IssueProgressRepository persistence;
    private final LinkedWorkRepository linkedWork;
    private final OperationsIdentity identity;

    public IssueProgressService(
            IssueProgressRepository persistence,
            OperationsIdentity identity,
            LinkedWorkRepository linkedWork) {
        this.persistence = persistence;
        this.linkedWork = linkedWork;
        this.identity = identity;
    }

    private Worker currentWorker() {
        String email = identity.email();
        var workers = persistence.findWorkers(email);
        return workers.isEmpty() ? null : workers.getFirst();
    }

    public IssueWorkContext getContext() {
        var worker = currentWorker();
        return worker == null
                ? new IssueWorkContext(
                        false,
                        null,
                        null,
                        "Tài khoản hiện tại không có hồ sơ nhân viên buồng phòng (HOUSEKEEPER) đang hoạt động.")
                : new IssueWorkContext(
                        true,
                        worker.staffId(),
                        worker.name(),
                        "Xử lý bằng nhân viên đang đăng nhập.");
    }

    // Revalidate the logged-in staff account and hotel membership in SQL.
    public Worker requireWorker() {
        var worker = currentWorker();
        if (worker == null)
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản hiện tại cần hồ sơ nhân viên và vai trò HOUSEKEEPER đang hoạt động.");
        return worker;
    }

    private void assertAssignedIssue(Long issueId, Worker worker, String expectedStatus) {
        List<IssueState> issues = persistence.findActiveIssue(issueId);
        if (issues.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active issue not found");
        var issue = issues.getFirst();
        if (!worker.hotelId().equals(issue.hotelId())
                || !worker.staffId().equals(issue.assignedStaffId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Only the assigned staff member may update this issue");
        }
        if (!expectedStatus.equals(issue.status()))
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Issue is not in the required state; refresh before continuing");
    }

    @Transactional
    public IssueProgressResponse start(Long issueId) {
        var worker = requireWorker();
        var pair = LinkedWorkGuard.forIssue(linkedWork, issueId);
        if (pair != null) pair.requireWorker(worker.staffId());
        assertAssignedIssue(issueId, worker, "ASSIGNED");
        int changed = persistence.startIssue(issueId, worker.staffId());
        requireChanged(changed);
        int linkedChanged = persistence.startLinkedTask(issueId, worker.staffId());
        if (pair != null) requireChanged(linkedChanged);
        return new IssueProgressResponse(issueId, "IN_PROGRESS");
    }

    @Transactional
    public IssueProgressResponse resolve(Long issueId, ResolveIssueRequest request) {
        var worker = requireWorker();
        var pair = LinkedWorkGuard.forIssue(linkedWork, issueId);
        if (pair != null) pair.requireWorker(worker.staffId());
        assertAssignedIssue(issueId, worker, "IN_PROGRESS");
        // Unicode note is bound explicitly, not concatenated into SQL.
        int changed = persistence.resolveIssue(issueId, worker.staffId(), request);
        requireChanged(changed);
        int linkedChanged = persistence.completeLinkedTask(issueId, worker.staffId());
        if (pair != null) requireChanged(linkedChanged);
        return new IssueProgressResponse(issueId, "RESOLVED");
    }

    private void requireChanged(int changed) {
        if (changed != 1)
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Issue changed concurrently; refresh before updating again");
    }
}
