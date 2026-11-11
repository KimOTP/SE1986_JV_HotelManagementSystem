package com.hotel.hms.operations.service;

import static org.springframework.http.HttpStatus.*;

import com.hotel.hms.operations.repository.LinkedWorkRepository;

import org.springframework.web.server.ResponseStatusException;

import java.util.*;

/** All linked mutations acquire issue then task locks, regardless of API entry point. */
final class LinkedWorkGuard {
    record Item(Long id, Long staffId, String status, Long roomId) {}

    record Pair(Item issue, Item task) {
        void requireWorker(Long workerId) {
            if (!Objects.equals(issue.staffId(), workerId)
                    || !Objects.equals(task.staffId(), workerId)) {
                throw new ResponseStatusException(
                        FORBIDDEN, "Công việc đã được bàn giao cho nhân viên khác.");
            }
        }
    }

    private LinkedWorkGuard() {}

    private static List<Long> issueIds(LinkedWorkRepository repository, Long id) {
        return repository.findIssueIdsByTask(id);
    }

    static boolean hasIssue(LinkedWorkRepository repository, Long id) {
        return !issueIds(repository, id).isEmpty();
    }

    static Pair forTask(LinkedWorkRepository repository, Long id) {
        var linkedIssueIds = issueIds(repository, id);
        if (linkedIssueIds.isEmpty()) {
            return null;
        }
        var pair = forIssue(repository, linkedIssueIds.getFirst());
        if (pair == null || !pair.task().id().equals(id)) {
            throw conflict();
        }
        return pair;
    }

    static Pair forIssue(LinkedWorkRepository repository, Long id) {
        // The common lock order prevents task and issue APIs from locking in opposite orders.
        var issues = repository.lockIssue(id);
        if (issues.isEmpty()) {
            return null;
        }
        var tasks = repository.lockTasksForIssue(id);
        if (tasks.isEmpty()) {
            return null;
        }
        if (tasks.size() != 1) {
            throw conflict();
        }
        var pair = new Pair(item(issues.getFirst()), item(tasks.getFirst()));
        // A linked task and issue use different status names for the same progress.
        String expectedIssueStatus =
                switch (pair.task().status()) {
                    case "PENDING" -> "ASSIGNED";
                    case "IN_PROGRESS" -> "IN_PROGRESS";
                    case "COMPLETED" -> "RESOLVED";
                    default -> "";
                };
        boolean statusesMatch =
                expectedIssueStatus.equals(pair.issue().status())
                        || ("COMPLETED".equals(pair.task().status())
                                && "CLOSED".equals(pair.issue().status()));
        if (!statusesMatch
                || !Objects.equals(pair.issue().staffId(), pair.task().staffId())
                || !Objects.equals(pair.issue().roomId(), pair.task().roomId())) {
            throw conflict();
        }
        return pair;
    }

    private static Item item(Map<String, Object> row) {
        return new Item(
                number(row.get("id")),
                number(row.get("staffId")),
                (String) row.get("status"),
                number(row.get("roomId")));
    }

    private static Long number(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }

    private static ResponseStatusException conflict() {
        return new ResponseStatusException(
                CONFLICT,
                "Task và sự cố liên kết chưa đồng nhất. Vui lòng báo quản lý kiểm tra dữ liệu trước khi tiếp tục.");
    }
}
