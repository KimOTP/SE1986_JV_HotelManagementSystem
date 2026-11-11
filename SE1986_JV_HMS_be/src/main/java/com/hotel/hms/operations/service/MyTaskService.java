package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.repository.IssueProgressRepository;
import com.hotel.hms.operations.repository.LinkedWorkRepository;
import com.hotel.hms.operations.repository.MyTaskRepository;
import com.hotel.hms.operations.repository.MyTaskRepository.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class MyTaskService {
    private final MyTaskRepository persistence;
    private final LinkedWorkRepository linkedWork;
    private final IssueProgressService staffContext;

    public MyTaskService(
            MyTaskRepository persistence,
            IssueProgressService staffContext,
            LinkedWorkRepository linkedWork) {
        this.persistence = persistence;
        this.linkedWork = linkedWork;
        this.staffContext = staffContext;
    }

    public List<MyTaskResponse> getTasks(
            int page, int size, String room, String status, String type) {
        var staff = staffContext.requireWorker();
        return persistence.findTasks(
                staff.staffId(), staff.hotelId(), page, size, room, status, type);
    }

    private void assertTask(Long id, IssueProgressRepository.Worker worker, String expectedStatus) {
        var tasks = persistence.findActiveTask(id);
        if (tasks.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active task not found");
        var task = tasks.getFirst();
        if (!worker.staffId().equals(task.assignedStaffId())
                || !worker.hotelId().equals(task.hotelId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Task is not assigned to this staff member");
        }
        if (!expectedStatus.equals(task.status()))
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Task state changed; refresh before continuing");
    }

    @Transactional
    public TaskProgressResponse start(Long id) {
        var worker = staffContext.requireWorker();
        var pair = LinkedWorkGuard.forTask(linkedWork, id);
        if (pair != null) pair.requireWorker(worker.staffId());
        assertTask(id, worker, "PENDING");
        int changed = persistence.startTask(id, worker.staffId());
        requireChanged(changed);
        // A linked issue must move with the task; requireChanged rolls back on a mismatch.
        int linkedChanged = persistence.startLinkedIssue(id);
        if (pair != null) requireChanged(linkedChanged);
        return new TaskProgressResponse(id, "IN_PROGRESS");
    }

    @Transactional
    public TaskProgressResponse complete(Long id) {
        var worker = staffContext.requireWorker();
        var pair = LinkedWorkGuard.forTask(linkedWork, id);
        if (pair != null) pair.requireWorker(worker.staffId());
        assertTask(id, worker, "IN_PROGRESS");
        int changed = persistence.completeTask(id, worker.staffId());
        requireChanged(changed);
        // Complete both records atomically; an independent task has no linked issue to update.
        int linkedChanged = persistence.resolveLinkedIssue(id);
        if (pair != null) requireChanged(linkedChanged);
        return new TaskProgressResponse(id, "COMPLETED");
    }

    private void requireChanged(int changed) {
        if (changed != 1)
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Task changed concurrently or timestamps are inconsistent; refresh the list");
    }
}
