-- ADMIN chi giu quyen quan tri; le tan duoc xem danh sach dat phong (UC-C5).
-- ADMIN chi giu: dang nhap/ho so (A2-A4), quan ly tai khoan va vai tro (A5, A6),
-- quan ly loai phong, phong, tien nghi (B1-B3). Viec van hanh tra ve cho quan ly va nhan vien.
-- Chay lai nhieu lan van an toan. Co the cap lai quyen o man UC-A6.
USE HotelManagement_SBA;
GO
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

DELETE rp
FROM identity_access.role_permissions rp
JOIN identity_access.roles r ON r.role_id = rp.role_id AND r.code = 'ADMIN'
JOIN identity_access.permissions p ON p.permission_id = rp.permission_id
WHERE p.code NOT IN ('UC-A2','UC-A3','UC-A4','UC-A5','UC-A6','UC-B1','UC-B2','UC-B3');

INSERT identity_access.role_permissions(role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM identity_access.roles r
JOIN identity_access.permissions p ON p.code = 'UC-C5'
WHERE r.code = 'RECEPTIONIST'
  AND NOT EXISTS (
    SELECT 1 FROM identity_access.role_permissions rp
    WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id);

COMMIT TRANSACTION;
GO
