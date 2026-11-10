-- ADMIN chi giu quyen quan tri; le tan duoc xem danh sach dat phong (UC-C5).
-- Bo UC-C1..C4 (dat phong ca nhan) va UC-E2 (cong viec buong phong) khoi ADMIN.
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
WHERE p.code IN ('UC-C1','UC-C2','UC-C3','UC-C4','UC-E2');

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
