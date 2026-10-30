package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.IssueResponse;
import com.hotel.hms.operations.repository.IssueRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class IssueService {
    private final IssueRepository repository;
    public IssueService(IssueRepository repository) {
        this.repository = repository;
    }
    public List<IssueResponse> getIssues(int page, int size, String room, String status, String category) {
        return repository.findIssues(room.trim(), status.trim(), category.trim(), PageRequest.of(page, size)).stream().map(issue -> {
            var staff = issue.getAssignedStaff();
            return new IssueResponse(
                    issue.getId(), issue.getRoom().getId(), issue.getRoom().getRoomNumber(),
                    issue.getIssueType().getId(), issue.getIssueType().getName(),
                    issue.getTitle(), issue.getDescription(), issue.getPriority(), issue.getStatus(),
                    issue.getReporter().getId(), issue.getReporter().getFullName(),
                    staff == null ? null : staff.getId(),
                    staff == null ? null : staff.getUser().getFullName(),
                    issue.getCreatedAt()
            );
        }).toList();
    }
}
