-- Issues assigned before assignment created a linked task never appeared in the
-- housekeeper's "Công việc của tôi". Create the missing task for each of them.
INSERT INTO operations.tasks (room_id, issue_id, assigned_staff_id, assigned_by, task_type,
                              title, description, priority, status, scheduled_at, started_at)
SELECT i.room_id, i.issue_id, i.assigned_staff_id, i.assigned_by, 'MAINTENANCE', i.title, i.description,
       i.priority,
       CASE WHEN i.status = 'IN_PROGRESS' THEN 'IN_PROGRESS' ELSE 'PENDING' END,
       SYSUTCDATETIME(),
       CASE WHEN i.status = 'IN_PROGRESS' THEN SYSUTCDATETIME() END
FROM operations.issues i
WHERE i.status IN ('ASSIGNED', 'IN_PROGRESS')
  AND i.assigned_staff_id IS NOT NULL
  AND i.assigned_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM operations.tasks t WHERE t.issue_id = i.issue_id);
