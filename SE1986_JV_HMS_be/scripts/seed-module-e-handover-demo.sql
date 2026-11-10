-- Local demo only. Pass a bcrypt hash via sqlcmd -v DemoPasswordHash="...".
-- Creates two dedicated HOUSEKEEPER accounts and four labelled test scenarios; reruns do not reset them.
USE HotelManagement_SBA;
GO
SET NOCOUNT ON;
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;
DECLARE @hash VARCHAR(100)='$(DemoPasswordHash)',@hotel BIGINT,@role BIGINT,@customer BIGINT,@manager BIGINT,@room BIGINT,@type BIGINT;
IF LEN(@hash)<>60 OR LEFT(@hash,2)<>'$2' THROW 51000,'Supply a valid bcrypt hash for demo accounts',1;
SELECT @role=role_id FROM identity_access.roles WHERE code='HOUSEKEEPER' AND is_active=1;
SELECT @customer=user_id FROM identity_access.users WHERE email='customer@sba.example' AND is_active=1;
SELECT @manager=u.user_id,@hotel=s.hotel_id FROM identity_access.users u JOIN identity_access.staff s ON s.user_id=u.user_id WHERE u.email='manager@sba.example' AND u.is_active=1 AND s.is_active=1;
IF @role IS NULL OR @customer IS NULL OR @manager IS NULL THROW 51001,'Demo customer, manager and HOUSEKEEPER role are required',1;
SELECT TOP(1) @room=r.room_id FROM inventory.rooms r JOIN inventory.room_types t ON t.room_type_id=r.room_type_id WHERE t.hotel_id=@hotel AND r.is_active=1 AND t.is_active=1 ORDER BY r.room_id;
SELECT TOP(1) @type=issue_type_id FROM operations.issue_types WHERE is_active=1 ORDER BY issue_type_id;
IF @room IS NULL OR @type IS NULL THROW 51002,'Active room and issue type required',1;
DECLARE @workers TABLE(n INT,email VARCHAR(254),name NVARCHAR(150),employee VARCHAR(30));
INSERT @workers VALUES(1,'housekeeper.test1@sba.example',N'Buồng phòng Test A','DEMO-E-A'),(2,'housekeeper.test2@sba.example',N'Buồng phòng Test B','DEMO-E-B');
INSERT identity_access.users(full_name,email,phone,password_hash,email_verified)
SELECT w.name,w.email,'0900000000',@hash,1 FROM @workers w WHERE NOT EXISTS(SELECT 1 FROM identity_access.users u WHERE u.email COLLATE DATABASE_DEFAULT=w.email COLLATE DATABASE_DEFAULT);
INSERT identity_access.user_roles(user_id,role_id)
SELECT u.user_id,@role FROM @workers w JOIN identity_access.users u ON u.email COLLATE DATABASE_DEFAULT=w.email COLLATE DATABASE_DEFAULT WHERE NOT EXISTS(SELECT 1 FROM identity_access.user_roles ur WHERE ur.user_id=u.user_id AND ur.role_id=@role);
INSERT identity_access.staff(user_id,hotel_id,employee_code,job_title)
SELECT u.user_id,@hotel,w.employee,N'Buồng phòng kiểm thử' FROM @workers w JOIN identity_access.users u ON u.email COLLATE DATABASE_DEFAULT=w.email COLLATE DATABASE_DEFAULT WHERE NOT EXISTS(SELECT 1 FROM identity_access.staff s WHERE s.user_id=u.user_id);
DECLARE @a BIGINT,@b BIGINT;
SELECT @a=s.staff_id FROM identity_access.staff s JOIN identity_access.users u ON u.user_id=s.user_id WHERE u.email='housekeeper.test1@sba.example' AND s.is_active=1 AND u.is_active=1;
SELECT @b=s.staff_id FROM identity_access.staff s JOIN identity_access.users u ON u.user_id=s.user_id WHERE u.email='housekeeper.test2@sba.example' AND s.is_active=1 AND u.is_active=1;
IF @a IS NULL OR @b IS NULL THROW 51003,'Demo workers must be active',1;
DECLARE @scenarios TABLE(title NVARCHAR(200),status VARCHAR(20),note NVARCHAR(2000));
INSERT @scenarios VALUES
(N'[TEST-DUCHM] 01 - Sự cố chờ phân công','OPEN',N'Khách báo thiết bị có tiếng ồn. Manager thử phân công cho Test A.'),
(N'[TEST-DUCHM] 02 - Bàn giao trước khi bắt đầu','ASSIGNED',N'Đã giao Test A. Manager thử chuyển sang Test B từ màn Sự cố hoặc Bảng công việc.'),
(N'[TEST-DUCHM] 03 - Bàn giao việc đang làm','IN_PROGRESS',N'Test A đang xử lý. Manager không được giao lại; chỉ Test A được hoàn thành công việc.');
INSERT operations.issues(room_id,issue_type_id,reported_by,assigned_staff_id,assigned_by,title,description,status,priority)
SELECT @room,@type,@customer,CASE WHEN d.status='OPEN' THEN NULL ELSE @a END,CASE WHEN d.status='OPEN' THEN NULL ELSE @manager END,d.title,d.note,d.status,'NORMAL'
FROM @scenarios d WHERE NOT EXISTS(SELECT 1 FROM operations.issues i WHERE i.title COLLATE DATABASE_DEFAULT=d.title COLLATE DATABASE_DEFAULT AND i.reported_by=@customer);
INSERT operations.tasks(room_id,issue_id,assigned_staff_id,assigned_by,task_type,title,description,priority,status,scheduled_at,started_at)
SELECT i.room_id,i.issue_id,i.assigned_staff_id,i.assigned_by,'MAINTENANCE',i.title,i.description,i.priority,CASE WHEN i.status='IN_PROGRESS' THEN 'IN_PROGRESS' ELSE 'PENDING' END,SYSUTCDATETIME(),CASE WHEN i.status='IN_PROGRESS' THEN SYSUTCDATETIME() END
FROM operations.issues i JOIN @scenarios d ON d.title COLLATE DATABASE_DEFAULT=i.title COLLATE DATABASE_DEFAULT WHERE i.reported_by=@customer AND i.status IN ('ASSIGNED','IN_PROGRESS') AND NOT EXISTS(SELECT 1 FROM operations.tasks t WHERE t.issue_id=i.issue_id);
IF NOT EXISTS(SELECT 1 FROM operations.tasks WHERE title=N'[TEST-DUCHM] 04 - Công việc độc lập để thử hủy')
INSERT operations.tasks(room_id,assigned_staff_id,assigned_by,task_type,title,description,priority,status,scheduled_at)
VALUES(@room,@a,@manager,'CLEANING',N'[TEST-DUCHM] 04 - Công việc độc lập để thử hủy',N'Task không gắn sự cố. Thử giao lại hoặc hủy và xem lịch sử. Không đổi trạng thái phòng.','LOW','PENDING',SYSUTCDATETIME());
COMMIT;
SELECT i.issue_id,i.title,i.status,i.assigned_staff_id,t.task_id,t.status AS task_status,t.assigned_staff_id AS task_staff_id FROM operations.issues i LEFT JOIN operations.tasks t ON t.issue_id=i.issue_id WHERE i.title LIKE N'[[]TEST-DUCHM]%' ORDER BY i.issue_id;
SELECT task_id,title,status,assigned_staff_id FROM operations.tasks WHERE title=N'[TEST-DUCHM] 04 - Công việc độc lập để thử hủy';
SELECT u.email,s.staff_id,s.employee_code FROM identity_access.users u JOIN identity_access.staff s ON s.user_id=u.user_id WHERE u.email IN ('housekeeper.test1@sba.example','housekeeper.test2@sba.example');
