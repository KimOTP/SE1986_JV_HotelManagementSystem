-- Cap nhat database da tao bang schema cu cho khop docs/sql/01_schema_complete_module_b.sql.
-- Chi THEM cot va bang con thieu, khong xoa du lieu. Chay lai nhieu lan van an toan.
-- Database moi tao tu schema hoan chinh thi khong can chay file nay.
SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH('inventory.rooms', 'notes') IS NULL
    ALTER TABLE inventory.rooms ADD notes NVARCHAR(2000) NULL;
GO

IF OBJECT_ID('inventory.room_type_images', 'U') IS NULL
    CREATE TABLE inventory.room_type_images (
        image_id BIGINT IDENTITY(1,1) PRIMARY KEY,
        room_type_id BIGINT NOT NULL REFERENCES inventory.room_types(room_type_id),
        image_url NVARCHAR(1000) NOT NULL,
        sort_order INT NOT NULL CHECK(sort_order BETWEEN 0 AND 5),
        UNIQUE(room_type_id, sort_order)
    );
GO
