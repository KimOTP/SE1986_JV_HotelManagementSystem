-- Tach vai tro STAFF thanh RECEPTIONIST (Le tan) va HOUSEKEEPER (Buong phong).
-- Chay tren database da co du lieu; chay lai nhieu lan van an toan.
--
-- Nguoi dung dang la STAFF duoc chuyen sang HOUSEKEEPER neu chuc danh (staff.job_title) co
-- "don phong", "buong" hoac "housekeep"; con lai chuyen sang RECEPTIONIST.
-- Sau khi chay, kiem tra lai o man Quan ly tai khoan va sua vai tro neu can.
USE HotelManagement_SBA;
GO
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

BEGIN TRANSACTION;

-- 1. Hai vai tro moi
INSERT identity_access.roles(code, name)
SELECT v.code, v.name
FROM (VALUES ('RECEPTIONIST', N'Lễ tân'), ('HOUSEKEEPER', N'Buồng phòng')) v(code, name)
WHERE NOT EXISTS (SELECT 1 FROM identity_access.roles r WHERE r.code = v.code);

-- 2. Quyen cua tung vai tro (chinh lai o man UC-A6 neu can)
INSERT identity_access.role_permissions(role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM identity_access.roles r
JOIN identity_access.permissions p
  ON (r.code = 'RECEPTIONIST' AND p.code IN ('UC-A2','UC-A3','UC-A4','UC-B4','UC-B5','UC-B6','UC-C6','UC-D1','UC-D2','UC-D3','UC-D4','UC-E4'))
  OR (r.code = 'HOUSEKEEPER'  AND p.code IN ('UC-A2','UC-A3','UC-A4','UC-B6','UC-E2','UC-E4','UC-E5'))
WHERE NOT EXISTS (
    SELECT 1 FROM identity_access.role_permissions rp
    WHERE rp.role_id = r.role_id AND rp.permission_id = p.permission_id);

-- 3. Chuyen nguoi dung dang la STAFF sang vai tro moi
INSERT identity_access.user_roles(user_id, role_id)
SELECT ur.user_id,
       CASE WHEN s.job_title COLLATE Latin1_General_100_CI_AI LIKE N'%don phong%'
              OR s.job_title COLLATE Latin1_General_100_CI_AI LIKE N'%buong%'
              OR s.job_title COLLATE Latin1_General_100_CI_AI LIKE N'%housekeep%'
            THEN hk.role_id ELSE rc.role_id END
FROM identity_access.user_roles ur
JOIN identity_access.roles old ON old.role_id = ur.role_id AND old.code = 'STAFF'
LEFT JOIN identity_access.staff s ON s.user_id = ur.user_id
CROSS JOIN (SELECT role_id FROM identity_access.roles WHERE code = 'RECEPTIONIST') rc
CROSS JOIN (SELECT role_id FROM identity_access.roles WHERE code = 'HOUSEKEEPER') hk
WHERE NOT EXISTS (
    SELECT 1 FROM identity_access.user_roles x
    WHERE x.user_id = ur.user_id AND x.role_id IN (rc.role_id, hk.role_id));

-- 4. Xoa vai tro STAFF cu
DELETE ur FROM identity_access.user_roles ur
JOIN identity_access.roles r ON r.role_id = ur.role_id AND r.code = 'STAFF';
DELETE rp FROM identity_access.role_permissions rp
JOIN identity_access.roles r ON r.role_id = rp.role_id AND r.code = 'STAFF';
DELETE FROM identity_access.roles WHERE code = 'STAFF';

COMMIT TRANSACTION;
GO

-- Ket qua
SELECT r.code AS role, COUNT(DISTINCT ur.user_id) AS users, COUNT(DISTINCT rp.permission_id) AS permissions
FROM identity_access.roles r
LEFT JOIN identity_access.user_roles ur ON ur.role_id = r.role_id
LEFT JOIN identity_access.role_permissions rp ON rp.role_id = r.role_id
GROUP BY r.code, r.role_id ORDER BY r.role_id;
GO
