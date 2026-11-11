package com.hotel.hms.operations.service;

import static org.springframework.http.HttpStatus.*;

import org.springframework.jdbc.core.JdbcTemplate;
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

    private static List<Long> issueIds(JdbcTemplate jdbc, Long id) {
        return jdbc.queryForList(
                "SELECT issue_id FROM operations.tasks WHERE task_id=? AND issue_id IS NOT NULL",
                Long.class,
                id);
    }

    static boolean hasIssue(JdbcTemplate jdbc, Long id) {
        return !issueIds(jdbc, id).isEmpty();
    }

    static Pair forTask(JdbcTemplate jdbc, Long id) {
        var linkedIssueIds = issueIds(jdbc, id);
        if (linkedIssueIds.isEmpty()) {
            return null;
        }
        var pair = forIssue(jdbc, linkedIssueIds.getFirst());
        if (pair == null || !pair.task().id().equals(id)) {
            throw conflict();
        }
        return pair;
    }

    static Pair forIssue(JdbcTemplate jdbc, Long id) {
        // The common lock order prevents task and issue APIs from locking in opposite orders.
        var issues =
                jdbc.queryForList(
                        "SELECT issue_id AS id,assigned_staff_id AS staffId,status,room_id AS roomId FROM operations.issues WITH (UPDLOCK,HOLDLOCK) WHERE issue_id=?",
                        id);
        if (issues.isEmpty()) {
            return null;
        }
        var tasks =
                jdbc.queryForList(
                        "SELECT task_id AS id,assigned_staff_id AS staffId,status,room_id AS roomId FROM operations.tasks WITH (UPDLOCK,HOLDLOCK) WHERE issue_id=? ORDER BY task_id",
                        id);
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
