package com.hotel.hms.operations.service;

import static org.springframework.http.HttpStatus.*;

import com.hotel.hms.operations.repository.LinkedWorkRepository;
import com.hotel.hms.operations.repository.OperationsFollowUpRepository;
import com.hotel.hms.operations.repository.OperationsFollowUpRepository.*;
import com.hotel.hms.operations.security.OperationsIdentity;

import jakarta.validation.constraints.*;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@Transactional(readOnly = true)
public class OperationsFollowUpService {
    private final OperationsFollowUpRepository persistence;
    private final LinkedWorkRepository linkedWork;
    private final OperationsIdentity identity;
    private final IssueAssignmentService managers;

    public OperationsFollowUpService(
            OperationsFollowUpRepository persistence,
            OperationsIdentity identity,
            IssueAssignmentService managers,
            LinkedWorkRepository linkedWork) {
        this.persistence = persistence;
        this.linkedWork = linkedWork;
        this.identity = identity;
        this.managers = managers;
    }

    public record Change(
            @NotBlank @Pattern(regexp = "0x[0-9A-Fa-f]{16}") String version,
            @NotBlank @Pattern(regexp = "REASSIGN|CANCEL") String action,
            @Positive Long staffId,
            @NotBlank @Size(min = 5, max = 1000) String reason) {
        public Change {
            reason = reason == null ? null : reason.trim();
        }
    }

    private Work loadWork(boolean issue, Long id, boolean lock) {
        var rows = persistence.findWork(issue, id, lock);
        if (rows.isEmpty())
            throw new ResponseStatusException(NOT_FOUND, "Không tìm thấy công việc/sự cố.");
        return rows.getFirst();
    }

    private void requireMutable(Work work, boolean issue) {
        if ("IN_PROGRESS".equals(work.status()))
            throw new ResponseStatusException(
                    CONFLICT,
                    issue
                            ? "Sự cố đã được bắt đầu xử lý nên không thể giao lại. Hãy đóng và tải lại danh sách."
                            : "Công việc đã bắt đầu nên không thể giao lại hoặc hủy. Hãy đóng và tải lại danh sách.");
        if (!(issue ? List.of("ASSIGNED") : List.of("PENDING")).contains(work.status()))
            throw new ResponseStatusException(
                    CONFLICT,
                    "Chỉ được giao lại hoặc hủy khi công việc chưa bắt đầu. Sự cố phải ở trạng thái Đã phân công.");
    }

    public Map<String, Object> options(boolean issue, Long id) {
        var manager = managers.requireManager();
        var work = loadWork(issue, id, false);
        managers.assertScope(manager, work.hotelId());
        var staff = persistence.findStaff(work.hotelId());
        return Map.of(
                "work",
                work,
                "staff",
                staff,
                "canCancel",
                !issue
                        && "PENDING".equals(work.status())
                        && !LinkedWorkGuard.hasIssue(linkedWork, id),
                "canChange",
                (issue ? List.of("ASSIGNED") : List.of("PENDING")).contains(work.status()),
                "history",
                persistence.findHistory(issue, id));
    }

    @Transactional
    public void change(boolean issue, Long id, Change request) {
        // Lock the issue before its task, regardless of which screen initiated the change.
        var manager = managers.requireManager();
        var pair =
                issue
                        ? LinkedWorkGuard.forIssue(linkedWork, id)
                        : LinkedWorkGuard.forTask(linkedWork, id);
        var work = loadWork(issue, id, true);
        managers.assertScope(manager, work.hotelId());
        requireMutable(work, issue);
        // Reject a form opened before another assignment or progress update.
        if (!work.version().equalsIgnoreCase(request.version()))
            throw new ResponseStatusException(
                    CONFLICT, "Dữ liệu đã thay đổi. Hãy đóng và mở lại thao tác.");
        boolean cancel = "CANCEL".equals(request.action());
        if (issue && cancel)
            throw new ResponseStatusException(BAD_REQUEST, "Không hủy sự cố bằng thao tác này.");
        if (cancel && pair != null)
            throw new ResponseStatusException(
                    CONFLICT,
                    "Không hủy riêng task gắn với sự cố. Hãy giao lại hoặc hoàn tất xử lý sự cố.");
        Long nextStaffId = cancel ? work.staffId() : request.staffId();
        if (!cancel) {
            if (nextStaffId == null || Objects.equals(nextStaffId, work.staffId()))
                throw new ResponseStatusException(BAD_REQUEST, "Hãy chọn nhân viên khác.");
            Integer eligibleStaffCount =
                    persistence.countEligibleStaff(nextStaffId, work.hotelId());
            if (eligibleStaffCount == null || eligibleStaffCount != 1)
                throw new ResponseStatusException(
                        BAD_REQUEST, "Nhân viên không còn hoạt động hoặc không thuộc khách sạn.");
        }
        String nextStatus = cancel ? "CANCELLED" : work.status();
        int changed =
                persistence.updateWork(
                        issue,
                        id,
                        cancel,
                        nextStaffId,
                        manager.id(),
                        nextStatus,
                        request.version());
        if (changed != 1) throw new ResponseStatusException(CONFLICT, "Dữ liệu đã thay đổi.");
        if (pair != null) {
            // Keep both owners and both history entries in this transaction.
            var linkedWork = issue ? pair.task() : pair.issue();
            boolean linkedIsIssue = !issue;
            int linkedChanged =
                    persistence.updateLinkedWork(
                            linkedIsIssue,
                            nextStaffId,
                            manager.id(),
                            linkedWork.id(),
                            linkedWork.staffId(),
                            linkedWork.status());
            if (linkedChanged != 1)
                throw new ResponseStatusException(
                        CONFLICT, "Dữ liệu liên kết đã thay đổi. Vui lòng tải lại.");
            recordHistory(
                    linkedIsIssue,
                    linkedWork.id(),
                    request,
                    manager.id(),
                    linkedWork.staffId(),
                    nextStaffId,
                    linkedWork.status(),
                    linkedWork.status());
        }
        recordHistory(
                issue,
                id,
                request,
                manager.id(),
                work.staffId(),
                nextStaffId,
                work.status(),
                nextStatus);
    }

    private void recordHistory(
            boolean issue,
            Long id,
            Change request,
            Long actor,
            Long previousStaff,
            Long nextStaffId,
            String previousStatus,
            String nextStatus) {
        persistence.insertHistory(
                issue,
                id,
                request.action(),
                actor,
                previousStaff,
                nextStaffId,
                previousStatus,
                nextStatus,
                request.reason());
    }

    public List<Map<String, Object>> myReports(int page, int size) {
        var user = identity.requireUser();
        return persistence.findOwnReports(user.getId(), page, size);
    }
}
