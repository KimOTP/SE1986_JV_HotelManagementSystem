package com.hotel.hms.operations.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.*;

/** Shared locking queries. Call within the service transaction, issue before task. */
@Repository
public class LinkedWorkRepository {
    private final JdbcTemplate jdbc;

    public LinkedWorkRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Long> findIssueIdsByTask(Long id) {
        return jdbc.queryForList(
                "SELECT issue_id FROM operations.tasks WHERE task_id=? AND issue_id IS NOT NULL",
                Long.class,
                id);
    }

    public List<Map<String, Object>> lockIssue(Long id) {
        return jdbc.queryForList(
                "SELECT issue_id AS id,assigned_staff_id AS staffId,status,room_id AS roomId FROM operations.issues WITH (UPDLOCK,HOLDLOCK) WHERE issue_id=?",
                id);
    }

    public List<Map<String, Object>> lockTasksForIssue(Long id) {
        return jdbc.queryForList(
                "SELECT task_id AS id,assigned_staff_id AS staffId,status,room_id AS roomId FROM operations.tasks WITH (UPDLOCK,HOLDLOCK) WHERE issue_id=? ORDER BY task_id",
                id);
    }
}
