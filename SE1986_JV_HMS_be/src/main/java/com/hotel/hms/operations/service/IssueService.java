package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.IssueResponse;
import com.hotel.hms.operations.repository.IssueQueryRepository;
import com.hotel.hms.operations.repository.IssueQueryRepository.*;
import com.hotel.hms.operations.repository.IssueRepository;
import com.hotel.hms.operations.security.OperationsIdentity;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class IssueService {
    private final IssueRepository repository;
    private final IssueQueryRepository persistence;
    private final OperationsIdentity identity;
    private final IssueAssignmentService managers;
    private final IssueProgressService workers;

    public IssueService(
            IssueRepository repository,
            IssueQueryRepository persistence,
            OperationsIdentity identity,
            IssueAssignmentService managers,
            IssueProgressService workers) {
        this.repository = repository;
        this.persistence = persistence;
        this.identity = identity;
        this.managers = managers;
        this.workers = workers;
    }

    public List<IssueResponse> getIssues(
            int page, int size, String room, String status, String category) {
        var user = identity.requireUser();
        boolean management =
                user.getRoles().contains("ADMIN") || user.getRoles().contains("MANAGER");
        var manager = management ? managers.requireManager() : null;
        var worker = management ? null : workers.requireWorker();
        var ids =
                persistence.findVisibleIds(
                        manager != null && manager.admin() ? 1 : 0,
                        user.getId(),
                        management,
                        worker == null ? -1L : worker.staffId(),
                        page,
                        size,
                        room,
                        status,
                        category);
        if (ids.isEmpty()) return List.of();
        return repository.findIssuesByIds(ids).stream()
                .map(
                        issue -> {
                            var staff = issue.getAssignedStaff();
                            return new IssueResponse(
                                    issue.getId(),
                                    issue.getRoom().getId(),
                                    issue.getRoom().getRoomNumber(),
                                    issue.getIssueType().getId(),
                                    issue.getIssueType().getName(),
                                    issue.getTitle(),
                                    issue.getDescription(),
                                    issue.getPriority(),
                                    issue.getStatus(),
                                    issue.getReporter().getId(),
                                    issue.getReporter().getFullName(),
                                    staff == null ? null : staff.getId(),
                                    staff == null ? null : staff.getUser().getFullName(),
                                    issue.getCreatedAt(),
                                    issue.getResolutionNote(),
                                    issue.getResolvedAt());
                        })
                .toList();
    }
}
