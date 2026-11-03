package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.IssueResponse;
import com.hotel.hms.operations.repository.IssueRepository;
import com.hotel.hms.operations.security.OperationsIdentity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class IssueService {
    private final IssueRepository repository;
    private final JdbcTemplate jdbc;
    private final OperationsIdentity identity;
    private final IssueAssignmentService managers;
    private final IssueProgressService workers;
    public IssueService(IssueRepository repository, JdbcTemplate jdbc, OperationsIdentity identity,
                        IssueAssignmentService managers, IssueProgressService workers) {
        this.repository = repository; this.jdbc = jdbc; this.identity = identity;
        this.managers = managers; this.workers = workers;
    }
    public List<IssueResponse> getIssues(int page, int size, String room, String status, String category) {
        var user = identity.requireUser();
        boolean management = user.getRoles().contains("ADMIN") || user.getRoles().contains("MANAGER");
        var manager = management ? managers.requireManager() : null;
        var worker = management ? null : workers.requireWorker();
        var ids = jdbc.query("""
                SELECT i.issue_id FROM operations.issues i
                JOIN inventory.rooms r ON r.room_id = i.room_id
                JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                JOIN operations.issue_types it ON it.issue_type_id = i.issue_type_id
                WHERE r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                  AND (? = 1 OR EXISTS (SELECT 1 FROM identity_access.staff ms
                       WHERE ms.user_id = ? AND ms.hotel_id = rt.hotel_id AND ms.is_active = 1))
                  AND (? = 1 OR i.assigned_staff_id = ? OR i.reported_by = ?)
                  AND (? = '' OR CHARINDEX(?, r.room_number) > 0)
                  AND (? = '' OR i.status = ?) AND (? = '' OR it.name = ?)
                ORDER BY i.created_at DESC, i.issue_id DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """, (rs, rowIndex) -> rs.getLong("issue_id"),
                manager != null && manager.admin() ? 1 : 0, user.getId(), management ? 1 : 0,
                worker == null ? -1L : worker.staffId(), user.getId(),
                room.trim(), room.trim(), status.trim(), status.trim(), category.trim(), category.trim(), (long)page * size, size);
        if (ids.isEmpty()) return List.of();
        return repository.findIssuesByIds(ids).stream().map(issue -> {
            var staff = issue.getAssignedStaff();
            return new IssueResponse(
                    issue.getId(), issue.getRoom().getId(), issue.getRoom().getRoomNumber(),
                    issue.getIssueType().getId(), issue.getIssueType().getName(),
                    issue.getTitle(), issue.getDescription(), issue.getPriority(), issue.getStatus(),
                    issue.getReporter().getId(), issue.getReporter().getFullName(),
                    staff == null ? null : staff.getId(),
                    staff == null ? null : staff.getUser().getFullName(),
                    issue.getCreatedAt(), issue.getResolutionNote(), issue.getResolvedAt()
            );
        }).toList();
    }
}
