SET XACT_ABORT ON;
IF OBJECT_ID('operations.work_history','U') IS NULL
CREATE TABLE operations.work_history (
 history_id BIGINT IDENTITY PRIMARY KEY,
 work_type VARCHAR(10) NOT NULL CHECK(work_type IN ('TASK','ISSUE')),
 work_id BIGINT NOT NULL,
 action VARCHAR(15) NOT NULL CHECK(action IN ('REASSIGN','CANCEL')),
 actor_id BIGINT NOT NULL REFERENCES identity_access.users(user_id),
 previous_staff_id BIGINT NULL,
 new_staff_id BIGINT NULL,
 previous_status VARCHAR(25) NOT NULL,
 new_status VARCHAR(25) NOT NULL,
 reason NVARCHAR(1000) NOT NULL,
 created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
