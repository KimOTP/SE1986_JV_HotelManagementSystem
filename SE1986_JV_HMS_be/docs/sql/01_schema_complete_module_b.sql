-- COMPLETE SCHEMA: original schema plus Module B notes and room-type images.
-- NEW DATABASE ONLY. For an existing database use scripts/migrate-existing-db-module-b.sql instead.
-- Original seed 02_seed_demo.sql remains compatible; run only on a fresh empty database.
-- SQL Server database for SBA_Project (2).docx, modules A-E.
-- Run in SSMS as a complete script. Fresh database only; no DROP statements.
USE master;
GO
IF DB_ID(N'HotelManagement_SBA') IS NOT NULL
    THROW 51000, 'Database already exists. Use another name or an empty instance; this script never deletes existing data.', 1;
GO
CREATE DATABASE HotelManagement_SBA;
GO
USE HotelManagement_SBA;
GO
SET XACT_ABORT ON;
GO
CREATE SCHEMA identity_access;
GO
CREATE SCHEMA inventory;
GO
CREATE SCHEMA booking;
GO
CREATE SCHEMA billing;
GO
CREATE SCHEMA operations;
GO
BEGIN TRANSACTION;
CREATE TABLE identity_access.hotels (
    hotel_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(150) NOT NULL,
    address NVARCHAR(500) NOT NULL,
    phone VARCHAR(20) NULL,
    email NVARCHAR(254) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    row_version ROWVERSION
);
CREATE TABLE identity_access.users (
    user_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    full_name NVARCHAR(150) NOT NULL,
    email NVARCHAR(254) COLLATE Latin1_General_100_CI_AS NOT NULL UNIQUE,
    phone VARCHAR(20) NULL,
    password_hash VARCHAR(255) NULL,
    google_subject VARCHAR(255) NULL,
    avatar_url NVARCHAR(1000) NULL,
    email_verified BIT NOT NULL DEFAULT 0,
    is_active BIT NOT NULL DEFAULT 1,
    CHECK (password_hash IS NOT NULL OR google_subject IS NOT NULL),
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    row_version ROWVERSION
);
CREATE UNIQUE INDEX UX_users_google ON identity_access.users(google_subject) WHERE google_subject IS NOT NULL;
CREATE TABLE identity_access.roles (
    role_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name NVARCHAR(100) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1
);
CREATE TABLE identity_access.permissions (
    permission_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name NVARCHAR(150) NOT NULL
);
CREATE TABLE identity_access.user_roles (
    user_id BIGINT NOT NULL REFERENCES identity_access.users(user_id),
    role_id BIGINT NOT NULL REFERENCES identity_access.roles(role_id),
    PRIMARY KEY(user_id,role_id)
);
CREATE TABLE identity_access.role_permissions (
    role_id BIGINT NOT NULL REFERENCES identity_access.roles(role_id),
    permission_id BIGINT NOT NULL REFERENCES identity_access.permissions(permission_id),
    PRIMARY KEY(role_id,permission_id)
);
CREATE TABLE identity_access.staff (
    staff_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES identity_access.users(user_id) UNIQUE,
    hotel_id BIGINT NOT NULL REFERENCES identity_access.hotels(hotel_id),
    employee_code VARCHAR(30) NOT NULL UNIQUE,
    job_title NVARCHAR(100) NULL,
    is_active BIT NOT NULL DEFAULT 1
);
CREATE TABLE identity_access.auth_tokens (
    token_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES identity_access.users(user_id),
    token_hash CHAR(64) NOT NULL UNIQUE,
    purpose VARCHAR(30) NOT NULL CHECK(purpose IN ('EMAIL_VERIFY','PASSWORD_RESET','REFRESH')),
    expires_at DATETIME2(3) NOT NULL,
    consumed_at DATETIME2(3) NULL,
    revoked_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CHECK(expires_at > created_at)
);
CREATE TABLE inventory.room_types (
    room_type_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    hotel_id BIGINT NOT NULL REFERENCES identity_access.hotels(hotel_id),
    name NVARCHAR(100) NOT NULL,
    description NVARCHAR(2000) NULL,
    base_price DECIMAL(18,2) NOT NULL CHECK(base_price >= 0),
    max_guests INT NOT NULL CHECK(max_guests > 0),
    bed_description NVARCHAR(150) NULL,
    area_m2 DECIMAL(8,2) NULL CHECK(area_m2 > 0),
    is_active BIT NOT NULL DEFAULT 1,
    UNIQUE(hotel_id,name),
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    row_version ROWVERSION
);
CREATE TABLE inventory.amenities (
    amenity_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    description NVARCHAR(500) NULL,
    is_active BIT NOT NULL DEFAULT 1
);
CREATE TABLE inventory.room_type_amenities (
    room_type_id BIGINT NOT NULL REFERENCES inventory.room_types(room_type_id),
    amenity_id BIGINT NOT NULL REFERENCES inventory.amenities(amenity_id),
    PRIMARY KEY(room_type_id,amenity_id)
);
CREATE TABLE inventory.rooms (
    room_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    room_type_id BIGINT NOT NULL REFERENCES inventory.room_types(room_type_id),
    room_number NVARCHAR(20) NOT NULL,
    floor_number INT NOT NULL,
    notes NVARCHAR(2000) NULL,
    operational_status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK(operational_status IN ('AVAILABLE','OCCUPIED','MAINTENANCE')),
    housekeeping_status VARCHAR(20) NOT NULL DEFAULT 'CLEAN' CHECK(housekeeping_status IN ('CLEANING','CLEAN')),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    row_version ROWVERSION
);
CREATE TABLE inventory.room_images (
    image_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES inventory.rooms(room_id),
    image_url NVARCHAR(1000) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0 CHECK(sort_order >= 0),
    is_cover BIT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX UX_room_cover ON inventory.room_images(room_id) WHERE is_cover=1;
CREATE TABLE inventory.room_type_images (
    image_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    room_type_id BIGINT NOT NULL REFERENCES inventory.room_types(room_type_id),
    image_url NVARCHAR(1000) NOT NULL,
    sort_order INT NOT NULL CHECK(sort_order BETWEEN 0 AND 5),
    UNIQUE(room_type_id, sort_order)
);
CREATE TABLE booking.bookings (
    booking_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    booking_code VARCHAR(30) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES identity_access.users(user_id),
    hotel_id BIGINT NOT NULL REFERENCES identity_access.hotels(hotel_id),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guest_count INT NOT NULL CHECK(guest_count > 0),
    status VARCHAR(25) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','EXPIRED')),
    contact_name NVARCHAR(150) NOT NULL,
    contact_email NVARCHAR(254) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    special_requests NVARCHAR(2000) NULL,
    deposit_required DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK(deposit_required >= 0),
    hold_expires_at DATETIME2(3) NULL,
    cancel_reason NVARCHAR(1000) NULL,
    cancelled_at DATETIME2(3) NULL,
    CHECK(check_out_date > check_in_date),
    CHECK(status <> 'PENDING' OR hold_expires_at IS NOT NULL),
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    row_version ROWVERSION
);
CREATE TABLE booking.booking_rooms (
    booking_room_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking.bookings(booking_id),
    room_id BIGINT NOT NULL REFERENCES inventory.rooms(room_id),
    nightly_rate DECIMAL(18,2) NOT NULL CHECK(nightly_rate >= 0),
    actual_check_in_at DATETIME2(3) NULL,
    actual_check_out_at DATETIME2(3) NULL,
    UNIQUE(booking_id,room_id),
    CHECK(actual_check_out_at IS NULL OR (actual_check_in_at IS NOT NULL AND actual_check_out_at >= actual_check_in_at))
);
CREATE TABLE booking.booking_status_history (
    history_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking.bookings(booking_id),
    old_status VARCHAR(25) NULL CHECK(old_status IN ('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','EXPIRED')),
    new_status VARCHAR(25) NOT NULL CHECK(new_status IN ('PENDING','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','EXPIRED')),
    changed_by BIGINT NULL REFERENCES identity_access.users(user_id),
    changed_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    note NVARCHAR(1000) NULL
);
CREATE TABLE booking.guest_registrations (
    guest_registration_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    booking_room_id BIGINT NOT NULL REFERENCES booking.booking_rooms(booking_room_id),
    full_name NVARCHAR(150) NOT NULL,
    document_type VARCHAR(20) NULL CHECK(document_type IN ('CCCD','PASSPORT','OTHER')),
    document_number NVARCHAR(50) NULL,
    date_of_birth DATE NULL,
    nationality NVARCHAR(100) NULL,
    is_primary BIT NOT NULL DEFAULT 0,
    registered_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE billing.services (
    service_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    hotel_id BIGINT NOT NULL REFERENCES identity_access.hotels(hotel_id),
    name NVARCHAR(150) NOT NULL,
    unit NVARCHAR(30) NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL CHECK(unit_price >= 0),
    is_active BIT NOT NULL DEFAULT 1,
    UNIQUE(hotel_id,name)
);
CREATE TABLE billing.service_orders (
    service_order_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    booking_room_id BIGINT NOT NULL REFERENCES booking.booking_rooms(booking_room_id),
    service_id BIGINT NOT NULL REFERENCES billing.services(service_id),
    quantity DECIMAL(10,2) NOT NULL CHECK(quantity > 0),
    unit_price DECIMAL(18,2) NOT NULL CHECK(unit_price >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ORDERED' CHECK(status IN ('ORDERED','DELIVERED','CANCELLED')),
    created_by BIGINT NULL REFERENCES identity_access.users(user_id),
    ordered_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
);
CREATE TABLE billing.invoices (
    invoice_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    invoice_number VARCHAR(30) NOT NULL UNIQUE,
    booking_id BIGINT NOT NULL REFERENCES booking.bookings(booking_id) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ISSUED','PAID','VOID')),
    discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK(discount_amount >= 0),
    tax_amount DECIMAL(18,2) NOT NULL DEFAULT 0 CHECK(tax_amount >= 0),
    note NVARCHAR(1000) NULL,
    created_by BIGINT NOT NULL REFERENCES identity_access.users(user_id),
    issued_at DATETIME2(3) NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIME2(3) NULL,
    deleted_by BIGINT NULL REFERENCES identity_access.users(user_id),
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    row_version ROWVERSION
);
CREATE TABLE billing.invoice_items (
    invoice_item_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES billing.invoices(invoice_id),
    item_type VARCHAR(20) NOT NULL CHECK(item_type IN ('ROOM','SERVICE','OTHER')),
    booking_room_id BIGINT NULL REFERENCES booking.booking_rooms(booking_room_id),
    service_order_id BIGINT NULL REFERENCES billing.service_orders(service_order_id),
    description NVARCHAR(500) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL CHECK(quantity > 0),
    unit_price DECIMAL(18,2) NOT NULL CHECK(unit_price >= 0),
    line_total AS CONVERT(DECIMAL(18,2),quantity * unit_price) PERSISTED,
    CHECK ((item_type='ROOM' AND booking_room_id IS NOT NULL AND service_order_id IS NULL)
     OR (item_type='SERVICE' AND service_order_id IS NOT NULL AND booking_room_id IS NULL)
     OR (item_type='OTHER' AND booking_room_id IS NULL AND service_order_id IS NULL))
);
CREATE TABLE billing.payment_transactions (
    transaction_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking.bookings(booking_id),
    invoice_id BIGINT NULL REFERENCES billing.invoices(invoice_id),
    transaction_code VARCHAR(60) NOT NULL UNIQUE,
    transaction_type VARCHAR(20) NOT NULL CHECK(transaction_type IN ('DEPOSIT','PAYMENT','REFUND')),
    method VARCHAR(20) NOT NULL CHECK(method IN ('CASH','BANK_TRANSFER','GATEWAY')),
    amount DECIMAL(18,2) NOT NULL CHECK(amount > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SUCCESS','FAILED','CANCELLED')),
    provider_reference VARCHAR(150) NULL,
    refund_of_transaction_id BIGINT NULL REFERENCES billing.payment_transactions(transaction_id),
    processed_by BIGINT NULL REFERENCES identity_access.users(user_id),
    paid_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CHECK ((transaction_type='REFUND' AND refund_of_transaction_id IS NOT NULL) OR (transaction_type<>'REFUND' AND refund_of_transaction_id IS NULL)),
    CHECK(status <> 'SUCCESS' OR paid_at IS NOT NULL)
);
CREATE UNIQUE INDEX UX_payment_provider ON billing.payment_transactions(provider_reference) WHERE provider_reference IS NOT NULL;
CREATE TABLE operations.issue_types (
    issue_type_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE,
    is_active BIT NOT NULL DEFAULT 1
);
CREATE TABLE operations.issues (
    issue_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES inventory.rooms(room_id),
    issue_type_id BIGINT NOT NULL REFERENCES operations.issue_types(issue_type_id),
    reported_by BIGINT NOT NULL REFERENCES identity_access.users(user_id),
    assigned_staff_id BIGINT NULL REFERENCES identity_access.staff(staff_id),
    assigned_by BIGINT NULL REFERENCES identity_access.users(user_id),
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(2000) NOT NULL,
    priority VARCHAR(15) NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW','NORMAL','HIGH','URGENT')),
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','ASSIGNED','IN_PROGRESS','RESOLVED','CLOSED')),
    resolution_note NVARCHAR(2000) NULL,
    resolved_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    row_version ROWVERSION
);
CREATE TABLE operations.tasks (
    task_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    room_id BIGINT NOT NULL REFERENCES inventory.rooms(room_id),
    issue_id BIGINT NULL REFERENCES operations.issues(issue_id),
    assigned_staff_id BIGINT NOT NULL REFERENCES identity_access.staff(staff_id),
    assigned_by BIGINT NOT NULL REFERENCES identity_access.users(user_id),
    task_type VARCHAR(20) NOT NULL DEFAULT 'CLEANING' CHECK(task_type IN ('CLEANING','MAINTENANCE')),
    title NVARCHAR(200) NOT NULL,
    description NVARCHAR(2000) NULL,
    priority VARCHAR(15) NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW','NORMAL','HIGH','URGENT')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','IN_PROGRESS','COMPLETED','CANCELLED')),
    scheduled_at DATETIME2(3) NOT NULL,
    started_at DATETIME2(3) NULL,
    completed_at DATETIME2(3) NULL,
    CHECK(completed_at IS NULL OR (started_at IS NOT NULL AND completed_at >= started_at)),
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    row_version ROWVERSION
);
CREATE TABLE operations.feedback (
    feedback_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking.bookings(booking_id) UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES identity_access.users(user_id),
    rating TINYINT NOT NULL CHECK(rating BETWEEN 1 AND 5),
    comment NVARCHAR(2000) NOT NULL,
    reply NVARCHAR(2000) NULL,
    replied_by BIGINT NULL REFERENCES identity_access.users(user_id),
    replied_at DATETIME2(3) NULL,
    created_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    row_version ROWVERSION
);
CREATE INDEX IX_room_type ON inventory.rooms(room_type_id,is_active);
CREATE INDEX IX_booking_search ON booking.bookings(hotel_id,status,check_in_date,check_out_date) INCLUDE(hold_expires_at);
CREATE INDEX IX_booking_customer ON booking.bookings(customer_id,created_at);
CREATE INDEX IX_booking_room_search ON booking.booking_rooms(room_id,booking_id);
CREATE INDEX IX_booking_timeline ON booking.booking_status_history(booking_id,changed_at);
CREATE INDEX IX_tasks_workload ON operations.tasks(assigned_staff_id,status,scheduled_at);
CREATE INDEX IX_issues_board ON operations.issues(status,assigned_staff_id);
CREATE INDEX IX_payment_booking ON billing.payment_transactions(booking_id,status);
CREATE INDEX IX_invoice_items ON billing.invoice_items(invoice_id);
COMMIT TRANSACTION;
GO
-- Enforce room-number uniqueness within a hotel, derived through room_type.
CREATE TRIGGER inventory.tr_rooms_number ON inventory.rooms
AFTER INSERT, UPDATE AS
BEGIN
 SET NOCOUNT ON;
 -- Shared parent rows serialize concurrent catalog changes per hotel.
 DECLARE @lock BIGINT;
 SELECT @lock=h.hotel_id FROM identity_access.hotels h WITH(UPDLOCK,HOLDLOCK)
 WHERE h.hotel_id IN (SELECT t.hotel_id FROM inserted i JOIN inventory.room_types t ON t.room_type_id=i.room_type_id);
 IF EXISTS (SELECT t.hotel_id,r.room_number FROM inventory.rooms r
 JOIN inventory.room_types t ON t.room_type_id=r.room_type_id
 GROUP BY t.hotel_id,r.room_number HAVING COUNT(*)>1)
 THROW 51001, 'Room number must be unique within a hotel.', 1;
END;
GO
-- A room type cannot move between hotels: preserve historical ownership.
CREATE TRIGGER inventory.tr_room_type_hotel ON inventory.room_types
AFTER UPDATE AS
BEGIN
 SET NOCOUNT ON;
 IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON i.room_type_id=d.room_type_id WHERE i.hotel_id<>d.hotel_id)
 THROW 51002, 'Do not move a room type between hotels.', 1;
END;
GO
CREATE VIEW billing.v_invoice_totals AS
SELECT i.invoice_id,i.invoice_number,i.booking_id,i.status,i.is_deleted,
 COALESCE(x.subtotal,CONVERT(DECIMAL(18,2),0)) AS subtotal,
 i.discount_amount,i.tax_amount,
 COALESCE(x.subtotal,CONVERT(DECIMAL(18,2),0))-i.discount_amount+i.tax_amount AS total_amount
FROM billing.invoices i
OUTER APPLY (SELECT SUM(t.line_total) subtotal FROM billing.invoice_items t WHERE t.invoice_id=i.invoice_id) x;
GO
-- Room availability is derived from reservations, never a manually updated flag.
CREATE OR ALTER PROCEDURE inventory.search_available_rooms
 @hotel_id BIGINT, @check_in DATE, @check_out DATE,
 @guests_per_room INT=1, @room_type_id BIGINT=NULL
AS
BEGIN
 SET NOCOUNT ON;
 IF @hotel_id IS NULL OR @check_in IS NULL OR @check_out IS NULL OR @check_out<=@check_in OR @guests_per_room IS NULL OR @guests_per_room<1
 THROW 51003, 'Invalid search parameters.',1;
 SELECT r.room_id,r.room_number,r.floor_number,t.room_type_id,t.name,t.base_price,t.max_guests,
 r.operational_status,r.housekeeping_status
 FROM inventory.rooms r JOIN inventory.room_types t ON t.room_type_id=r.room_type_id
 JOIN identity_access.hotels h ON h.hotel_id=t.hotel_id
 WHERE t.hotel_id=@hotel_id AND h.is_active=1 AND r.is_active=1 AND t.is_active=1
 AND r.operational_status<>'MAINTENANCE' AND t.max_guests>=@guests_per_room
 AND (@room_type_id IS NULL OR t.room_type_id=@room_type_id)
 AND NOT EXISTS (
 SELECT 1 FROM booking.booking_rooms br JOIN booking.bookings b ON b.booking_id=br.booking_id
 WHERE br.room_id=r.room_id AND b.check_in_date<@check_out AND b.check_out_date>@check_in
 AND (b.status IN ('CONFIRMED','CHECKED_IN') OR (b.status='PENDING' AND b.hold_expires_at>SYSUTCDATETIME())))
 ORDER BY t.base_price,r.room_number;
END;
GO
