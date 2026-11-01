-- CHI DUNG CHO DATABASE LOCAL KHI PHAT TRIEN. Khong chay tren moi truong that.
-- Dat mat khau chung 123456 cho cac tai khoan seed @sba.example de ca nhom dang nhap thu:
--   admin@sba.example, manager@sba.example, reception@sba.example,
--   housekeeper@sba.example, customer@sba.example
-- Hash ben duoi la BCrypt (cost 10) cua "123456".
USE HotelManagement_SBA;
GO
-- Bang users co filtered index nen can bat QUOTED_IDENTIFIER (sqlcmd mac dinh tat).
SET QUOTED_IDENTIFIER ON;
GO

UPDATE identity_access.users
SET password_hash = '$2a$10$M0s39CIOnYfMi5SJ0aZjC.7RjXdjH4TXapernkJUB0A4lcEVrRocK',
    updated_at = SYSUTCDATETIME()
WHERE email LIKE '%@sba.example';

-- Thu hoi refresh token cu cua cac tai khoan nay.
UPDATE t
SET revoked_at = SYSUTCDATETIME()
FROM identity_access.auth_tokens t
JOIN identity_access.users u ON u.user_id = t.user_id
WHERE u.email LIKE '%@sba.example' AND t.revoked_at IS NULL AND t.consumed_at IS NULL;
GO
