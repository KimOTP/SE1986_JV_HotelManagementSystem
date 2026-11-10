-- Demo only. Run once after 01_schema.sql in SSMS.
USE HotelManagement_SBA;
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF EXISTS(SELECT 1 FROM identity_access.hotels)
 THROW 51100,'Demo seed requires an empty database.',1;
INSERT identity_access.hotels(name,address,phone,email) VALUES
 (N'SBA Hotel',N'Hà Nội, Việt Nam','0241234567','contact@sba.example');
INSERT identity_access.roles(code,name) VALUES
 ('ADMIN',N'Quản trị viên'),('MANAGER',N'Quản lý'),('RECEPTIONIST',N'Lễ tân'),('HOUSEKEEPER',N'Buồng phòng'),('CUSTOMER',N'Khách hàng');
INSERT identity_access.users(full_name,email,phone,password_hash,email_verified) VALUES(N'Admin Demo','admin@sba.example','0901234567','$2b$10$6p9R6eqKBc7rIUW8IU499euSwkOjq99O2lX3D5lHNhy9g4.ImGrqC',1);
INSERT identity_access.users(full_name,email,phone,password_hash,email_verified) VALUES(N'Manager Demo','manager@sba.example','0901234567','$2b$10$6p9R6eqKBc7rIUW8IU499euSwkOjq99O2lX3D5lHNhy9g4.ImGrqC',1);
INSERT identity_access.users(full_name,email,phone,password_hash,email_verified) VALUES(N'Reception Demo','reception@sba.example','0901234567','$2b$10$6p9R6eqKBc7rIUW8IU499euSwkOjq99O2lX3D5lHNhy9g4.ImGrqC',1);
INSERT identity_access.users(full_name,email,phone,password_hash,email_verified) VALUES(N'Housekeeper Demo','housekeeper@sba.example','0901234567','$2b$10$6p9R6eqKBc7rIUW8IU499euSwkOjq99O2lX3D5lHNhy9g4.ImGrqC',1);
INSERT identity_access.users(full_name,email,phone,password_hash,email_verified) VALUES(N'Customer Demo','customer@sba.example','0901234567','$2b$10$6p9R6eqKBc7rIUW8IU499euSwkOjq99O2lX3D5lHNhy9g4.ImGrqC',1);
INSERT identity_access.user_roles(user_id,role_id) VALUES(1,1),(2,2),(3,3),(4,4),(5,5);
INSERT identity_access.staff(user_id,hotel_id,employee_code,job_title) VALUES
 (2,1,'M001',N'Quản lý'),(3,1,'R001',N'Lễ tân'),(4,1,'H001',N'Dọn phòng');
INSERT identity_access.permissions(code,name) VALUES('UC-A1',N'UC-A1');
INSERT identity_access.permissions(code,name) VALUES('UC-A2',N'UC-A2');
INSERT identity_access.permissions(code,name) VALUES('UC-A3',N'UC-A3');
INSERT identity_access.permissions(code,name) VALUES('UC-A4',N'UC-A4');
INSERT identity_access.permissions(code,name) VALUES('UC-A5',N'UC-A5');
INSERT identity_access.permissions(code,name) VALUES('UC-A6',N'UC-A6');
INSERT identity_access.permissions(code,name) VALUES('UC-B1',N'UC-B1');
INSERT identity_access.permissions(code,name) VALUES('UC-B2',N'UC-B2');
INSERT identity_access.permissions(code,name) VALUES('UC-B3',N'UC-B3');
INSERT identity_access.permissions(code,name) VALUES('UC-B4',N'UC-B4');
INSERT identity_access.permissions(code,name) VALUES('UC-B5',N'UC-B5');
INSERT identity_access.permissions(code,name) VALUES('UC-B6',N'UC-B6');
INSERT identity_access.permissions(code,name) VALUES('UC-C1',N'UC-C1');
INSERT identity_access.permissions(code,name) VALUES('UC-C2',N'UC-C2');
INSERT identity_access.permissions(code,name) VALUES('UC-C3',N'UC-C3');
INSERT identity_access.permissions(code,name) VALUES('UC-C4',N'UC-C4');
INSERT identity_access.permissions(code,name) VALUES('UC-C5',N'UC-C5');
INSERT identity_access.permissions(code,name) VALUES('UC-C6',N'UC-C6');
INSERT identity_access.permissions(code,name) VALUES('UC-D1',N'UC-D1');
INSERT identity_access.permissions(code,name) VALUES('UC-D2',N'UC-D2');
INSERT identity_access.permissions(code,name) VALUES('UC-D3',N'UC-D3');
INSERT identity_access.permissions(code,name) VALUES('UC-D4',N'UC-D4');
INSERT identity_access.permissions(code,name) VALUES('UC-D5',N'UC-D5');
INSERT identity_access.permissions(code,name) VALUES('UC-D6',N'UC-D6');
INSERT identity_access.permissions(code,name) VALUES('UC-E1',N'UC-E1');
INSERT identity_access.permissions(code,name) VALUES('UC-E2',N'UC-E2');
INSERT identity_access.permissions(code,name) VALUES('UC-E3',N'UC-E3');
INSERT identity_access.permissions(code,name) VALUES('UC-E4',N'UC-E4');
INSERT identity_access.permissions(code,name) VALUES('UC-E5',N'UC-E5');
INSERT identity_access.permissions(code,name) VALUES('UC-E6',N'UC-E6');
INSERT identity_access.role_permissions(role_id,permission_id) SELECT r.role_id,p.permission_id FROM identity_access.roles r CROSS JOIN identity_access.permissions p WHERE r.code='ADMIN' AND p.code IN ('UC-A2','UC-A3','UC-A4','UC-A5','UC-A6','UC-B1','UC-B2','UC-B3');
INSERT identity_access.role_permissions(role_id,permission_id) SELECT r.role_id,p.permission_id FROM identity_access.roles r CROSS JOIN identity_access.permissions p WHERE r.code='MANAGER' AND p.code IN ('UC-A2','UC-A3','UC-A4','UC-B4','UC-B5','UC-B6','UC-C5','UC-C6','UC-D1','UC-D2','UC-D3','UC-D4','UC-D5','UC-E1','UC-E3','UC-E4','UC-E5','UC-E6');
INSERT identity_access.role_permissions(role_id,permission_id) SELECT r.role_id,p.permission_id FROM identity_access.roles r CROSS JOIN identity_access.permissions p WHERE r.code='RECEPTIONIST' AND p.code IN ('UC-A2','UC-A3','UC-A4','UC-B4','UC-B5','UC-B6','UC-C5','UC-C6','UC-D1','UC-D2','UC-D3','UC-D4','UC-E4');
INSERT identity_access.role_permissions(role_id,permission_id) SELECT r.role_id,p.permission_id FROM identity_access.roles r CROSS JOIN identity_access.permissions p WHERE r.code='HOUSEKEEPER' AND p.code IN ('UC-A2','UC-A3','UC-A4','UC-B6','UC-E2','UC-E4','UC-E5');
INSERT identity_access.role_permissions(role_id,permission_id) SELECT r.role_id,p.permission_id FROM identity_access.roles r CROSS JOIN identity_access.permissions p WHERE r.code='CUSTOMER' AND p.code IN ('UC-A1','UC-A2','UC-A3','UC-A4','UC-B4','UC-B5','UC-C1','UC-C2','UC-C3','UC-C4','UC-C6','UC-E4','UC-E6');
INSERT inventory.room_types(hotel_id,name,description,base_price,max_guests,bed_description,area_m2) VALUES
 (1,N'Standard',N'Phòng tiêu chuẩn',500000,2,N'1 giường đôi',22),
 (1,N'Deluxe',N'Phòng cao cấp',800000,3,N'1 giường đôi và 1 giường đơn',30),
 (1,N'Suite',N'Phòng suite',1500000,4,N'2 giường đôi',45);
INSERT inventory.amenities(name,icon) VALUES (N'Wi-Fi','wifi'),(N'Điều hòa','snow'),(N'Tivi','tv'),(N'Bồn tắm','water');
INSERT inventory.room_type_amenities VALUES(1,1),(1,2),(1,3),(2,1),(2,2),(2,3),(3,1),(3,2),(3,3),(3,4);
INSERT inventory.rooms(room_type_id,room_number,floor_number,operational_status,housekeeping_status) VALUES
 (1,'101',1,'AVAILABLE','CLEAN'),(1,'102',1,'AVAILABLE','CLEAN'),
 (1,'103',1,'MAINTENANCE','CLEAN'),(2,'201',2,'AVAILABLE','CLEAN'),
 (2,'202',2,'AVAILABLE','CLEAN'),(3,'301',3,'AVAILABLE','CLEAN');
INSERT billing.services(hotel_id,name,unit,unit_price) VALUES
 (1,N'Nước suối',N'Chai',15000),(1,N'Giặt là',N'Kg',50000),(1,N'Ăn sáng',N'Suất',100000);
INSERT operations.issue_types(name) VALUES(N'Điện'),(N'Nước'),(N'Thiết bị'),(N'Vệ sinh');
DECLARE @today DATE=CONVERT(DATE,SYSUTCDATETIME());
INSERT booking.bookings(booking_code,customer_id,hotel_id,check_in_date,check_out_date,guest_count,status,contact_name,contact_email,contact_phone,deposit_required,hold_expires_at) VALUES
 ('BK-DEMO-001',5,1,DATEADD(DAY,7,@today),DATEADD(DAY,9,@today),2,'CONFIRMED',N'Customer Demo','customer@sba.example','0901234567',300000,NULL),
 ('BK-DEMO-002',5,1,DATEADD(DAY,-3,@today),DATEADD(DAY,-1,@today),2,'CHECKED_OUT',N'Customer Demo','customer@sba.example','0901234567',0,NULL),
 ('BK-DEMO-003',5,1,DATEADD(DAY,7,@today),DATEADD(DAY,8,@today),2,'PENDING',N'Customer Demo','customer@sba.example','0901234567',240000,DATEADD(MINUTE,15,SYSUTCDATETIME()));
INSERT booking.booking_rooms(booking_id,room_id,nightly_rate) VALUES(1,1,500000),(2,2,500000),(3,4,800000);
UPDATE booking.booking_rooms SET actual_check_in_at=DATEADD(DAY,-3,CONVERT(DATETIME2,@today)),actual_check_out_at=DATEADD(DAY,-1,CONVERT(DATETIME2,@today)) WHERE booking_id=2;
INSERT booking.booking_status_history(booking_id,old_status,new_status,changed_by,changed_at,note) VALUES
 (1,NULL,'PENDING',5,DATEADD(MINUTE,-30,SYSUTCDATETIME()),N'Tạo booking'),
 (1,'PENDING','CONFIRMED',3,DATEADD(MINUTE,-20,SYSUTCDATETIME()),N'Đã nhận cọc'),
 (2,NULL,'PENDING',5,DATEADD(DAY,-4,SYSUTCDATETIME()),N'Tạo booking'),
 (2,'PENDING','CONFIRMED',3,DATEADD(DAY,-4,SYSUTCDATETIME()),N'Xác nhận'),
 (2,'CONFIRMED','CHECKED_IN',3,DATEADD(DAY,-3,SYSUTCDATETIME()),N'Nhận phòng'),
 (2,'CHECKED_IN','CHECKED_OUT',3,DATEADD(DAY,-1,SYSUTCDATETIME()),N'Trả phòng'),
 (3,NULL,'PENDING',5,SYSUTCDATETIME(),N'Giữ chỗ 15 phút');
INSERT booking.guest_registrations(booking_room_id,full_name,document_type,document_number,nationality,is_primary) VALUES
 (2,N'Customer Demo','OTHER','DEMO-NOT-REAL',N'Việt Nam',1);
INSERT billing.service_orders(booking_room_id,service_id,quantity,unit_price,status,created_by) VALUES(2,1,2,15000,'DELIVERED',3);
INSERT billing.invoices(invoice_number,booking_id,status,created_by,issued_at) VALUES('INV-DEMO-001',2,'PAID',3,DATEADD(DAY,-1,SYSUTCDATETIME()));
INSERT billing.invoice_items(invoice_id,item_type,booking_room_id,description,quantity,unit_price) VALUES(1,'ROOM',2,N'Phòng 102 - 2 đêm',2,500000);
INSERT billing.invoice_items(invoice_id,item_type,service_order_id,description,quantity,unit_price) VALUES(1,'SERVICE',1,N'Nước suối - 2 chai',2,15000);
INSERT billing.payment_transactions(booking_id,invoice_id,transaction_code,transaction_type,method,amount,status,processed_by,paid_at) VALUES
 (1,NULL,'TX-DEMO-DEPOSIT','DEPOSIT','BANK_TRANSFER',300000,'SUCCESS',3,DATEADD(MINUTE,-20,SYSUTCDATETIME())),
 (2,1,'TX-DEMO-PAYMENT','PAYMENT','CASH',1030000,'SUCCESS',3,DATEADD(DAY,-1,SYSUTCDATETIME()));
INSERT operations.issues(room_id,issue_type_id,reported_by,assigned_staff_id,assigned_by,title,description,status) VALUES
 (3,3,3,3,2,N'Điều hòa không hoạt động',N'Kiểm tra điều hòa phòng 103','ASSIGNED');
INSERT operations.tasks(room_id,issue_id,assigned_staff_id,assigned_by,task_type,title,scheduled_at) VALUES
 (3,1,3,2,'MAINTENANCE',N'Kiểm tra phòng 103',SYSUTCDATETIME()),
 (5,NULL,3,2,'CLEANING',N'Dọn phòng 202',SYSUTCDATETIME());
INSERT operations.feedback(booking_id,customer_id,rating,comment,reply,replied_by,replied_at) VALUES
 (2,5,5,N'Phòng sạch, nhân viên nhiệt tình.',N'Cảm ơn quý khách!',2,SYSUTCDATETIME());
COMMIT TRANSACTION;
GO
