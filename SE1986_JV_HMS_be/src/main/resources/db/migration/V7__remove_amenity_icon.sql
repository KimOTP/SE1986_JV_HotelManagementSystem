-- Remove the retired amenity icon field after updating Module B backend/frontend.
-- DESTRUCTIVE: permanently removes stored icon values. Review/back up before running.
-- Amenity rows, names, descriptions, status and room-type links are preserved.
-- Fresh databases created from the updated docs/sql schema do not need this script.
SET QUOTED_IDENTIFIER ON;
SET XACT_ABORT ON;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    IF OBJECT_ID('inventory.amenities', 'U') IS NULL
        THROW 51101, 'Missing inventory.amenities; use the schema for a fresh database.', 1;

    IF COL_LENGTH('inventory.amenities', 'icon') IS NOT NULL
        ALTER TABLE inventory.amenities DROP COLUMN icon;

    COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
