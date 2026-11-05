package com.hotel.hms.rooms;

import com.hotel.hms.rooms.dto.InventoryDtos;
import com.hotel.hms.rooms.repository.InventoryRepository;
import com.hotel.hms.rooms.repository.*;
import com.hotel.hms.rooms.entity.*;
import com.hotel.hms.rooms.service.InventoryService;
import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;

import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import java.sql.*;
import java.time.LocalDate;
import java.util.*;
import static com.hotel.hms.rooms.dto.InventoryDtos.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** Opt-in integration suite. Requires a separate database with supplied schema/procedure + migration.
 * Never uses DB_* or the team's HotelManagement_SBA database. Every fixture is rolled back.
 */
class InventorySqlServerTests {
    Connection connection;
    JdbcTemplate jdbc;
    InventoryService service;
    StandardServiceRegistry registry;
    SessionFactory sessionFactory;
    EntityManager entityManager;
    long hotel, type, room, user;
    LocalDate in = LocalDate.of(2035, 1, 10), out = in.plusDays(2);

    @BeforeEach
    void setup() throws Exception {
        String url = System.getenv("INVENTORY_TEST_JDBC_URL");
        assumeTrue(url != null && !url.isBlank(), "No dedicated SQL Server test database configured");
        connection = DriverManager.getConnection(url, System.getenv("INVENTORY_TEST_USERNAME"),
                System.getenv("INVENTORY_TEST_PASSWORD"));
        jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
        String database = jdbc.queryForObject("SELECT DB_NAME()", String.class);
        assertTrue(database != null && database.endsWith("_inventory_test"),
                "Test database name must end with _inventory_test");
        registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.connection.datasource",
                        new SingleConnectionDataSource(connection, true))
                .applySetting("hibernate.hbm2ddl.auto", "validate")
                .applySetting("hibernate.jdbc.use_get_generated_keys", true).build();
        var sources = new MetadataSources(registry);
        List.of(RoomType.class, Room.class, Amenity.class, RoomTypeImage.class, RoomImage.class)
                .forEach(sources::addAnnotatedClass);
        sessionFactory = sources.buildMetadata().buildSessionFactory();
        entityManager = sessionFactory.createEntityManager();
        entityManager.getTransaction().begin();
        // Fixture JDBC and JPA share this connection/transaction. Every change is rolled back.
        connection = entityManager.unwrap(org.hibernate.Session.class).doReturningWork(c -> c);
        jdbc = new JdbcTemplate(new SingleConnectionDataSource(connection, true));
        var repositories = new JpaRepositoryFactory(entityManager);
        service = new InventoryService(
                new InventoryRepository(repositories.getRepository(RoomTypeRepository.class),
                        repositories.getRepository(RoomRepository.class),
                        repositories.getRepository(AmenityRepository.class),
                        repositories.getRepository(RoomTypeImageRepository.class),
                        new InventoryReferenceRepository(entityManager), entityManager, true));
        String suffix = UUID.randomUUID().toString();
        hotel = id("INSERT identity_access.hotels(name,address) VALUES(?,N'Test')", suffix);
        user = id(
                "INSERT identity_access.users(full_name,email,password_hash) VALUES(N'Test',?,'test-only-unused')",
                suffix + "@example.invalid");
        type = id("INSERT inventory.room_types(hotel_id,name,base_price,max_guests) VALUES(?,N'Test',10,2)",
                hotel);
        room = id("INSERT inventory.rooms(room_type_id,room_number,floor_number) VALUES(?,N'T1',0)", type);
    }

    @AfterEach
    void rollback() throws Exception {
        try {
            if (entityManager != null && entityManager.isOpen()) {
                try {
                    if (entityManager.getTransaction().isActive())
                        entityManager.getTransaction().rollback();
                } finally {
                    entityManager.close();
                }
            }
        } finally {
            if (sessionFactory != null)
                sessionFactory.close();
            if (registry != null)
                StandardServiceRegistryBuilder.destroy(registry);
            if (connection != null && !connection.isClosed())
                connection.close();
        }
    }

    long id(String sql, Object... args) {
        return Objects.requireNonNull(jdbc.queryForObject(
                "SET NOCOUNT ON; " + sql + "; SELECT CONVERT(BIGINT,SCOPE_IDENTITY())", Long.class, args));
    }

    void booking(String status, LocalDate start, LocalDate end, int holdMinutes) {
        long booking = id("""
                INSERT booking.bookings(booking_code,customer_id,hotel_id,check_in_date,check_out_date,guest_count,status,
                contact_name,contact_email,contact_phone,hold_expires_at)
                VALUES(?,?,?,?,?,1,?,N'Test','test@example.invalid','0',DATEADD(MINUTE,?,SYSUTCDATETIME()))
                """, "T-" + UUID.randomUUID().toString().substring(0, 20), user, hotel,
                java.sql.Date.valueOf(start), java.sql.Date.valueOf(end), status, holdMinutes);
        jdbc.update("INSERT booking.booking_rooms(booking_id,room_id,nightly_rate) VALUES(?,?,10)", booking,
                room);
    }

    int count() {
        entityManager.clear();
        return service.availability(hotel, type, in, out, 1).availableRooms();
    }

    @Test
    void confirmedOverlapBlocks() {
        booking("CONFIRMED", in.minusDays(1), in.plusDays(1), 0);
        assertEquals(0, count());
    }

    @Test
    void checkoutAtNewCheckinDoesNotBlock() {
        booking("CONFIRMED", in.minusDays(2), in, 0);
        assertEquals(1, count());
    }

    @Test
    void cancelledDoesNotBlock() {
        booking("CANCELLED", in, out, 0);
        assertEquals(1, count());
    }

    @Test
    void checkedInBlocks() {
        booking("CHECKED_IN", in, out, 0);
        assertEquals(0, count());
    }

    @Test
    void pendingLiveHoldBlocks() {
        booking("PENDING", in, out, 15);
        assertEquals(0, count());
    }

    @Test
    void pendingExpiredHoldDoesNotBlockWithoutStatusJob() {
        booking("PENDING", in, out, -15);
        assertEquals(1, count());
    }

    @Test
    void checkedOutAndExpiredDoNotBlock() {
        booking("CHECKED_OUT", in, out, 0);
        booking("EXPIRED", in, out, 0);
        assertEquals(1, count());
    }

    @Test
    void inactiveRoomDoesNotSell() {
        jdbc.update("UPDATE inventory.rooms SET is_active=0 WHERE room_id=?", room);
        assertEquals(0, count());
    }

    @Test
    void inactiveTypeDoesNotSell() {
        jdbc.update("UPDATE inventory.room_types SET is_active=0 WHERE room_type_id=?", type);
        assertTrue(service.search(hotel, in, out, 1, null).isEmpty());
    }

    @Test
    void inactiveHotelDoesNotSell() {
        jdbc.update("UPDATE identity_access.hotels SET is_active=0 WHERE hotel_id=?", hotel);
        assertTrue(service.search(hotel, in, out, 1, null).isEmpty());
    }

    @Test
    void maintenanceDoesNotSell() {
        jdbc.update("UPDATE inventory.rooms SET operational_status='MAINTENANCE' WHERE room_id=?", room);
        assertEquals(0, count());
    }

    @Test
    void currentlyOccupiedCanSellFutureDates() {
        jdbc.update("UPDATE inventory.rooms SET operational_status='OCCUPIED' WHERE room_id=?", room);
        assertEquals(1, count());
    }

    @Test
    void dirtyAndCleaningDoNotBlockDateSearch() {
        for (String status : List.of("DIRTY", "CLEANING")) {
            jdbc.update("UPDATE inventory.rooms SET housekeeping_status=? WHERE room_id=?", status, room);
            assertEquals(1, count());
        }
    }

    @Test
    void insufficientCapacityDoesNotSell() {
        assertTrue(service.search(hotel, in, out, 3, null).isEmpty());
    }

    @Test
    void multipleNonBlockingReservationsDoNotDuplicateRoomCount() {
        booking("CANCELLED", in, out, 0);
        booking("EXPIRED", in, out, 0);
        assertEquals(1, count());
    }

    @Test
    void triggeredInsertGeneratedIdentityAndImageNotesRoundTrip() {
        var saved = service.saveType(hotel, null,
                new RoomTypeWrite("New type", "Mô tả", new java.math.BigDecimal("12.34"), 2, null, "Đôi",
                        List.of("https://example.com/a.jpg"), List.of(), true));
        assertEquals(List.of("https://example.com/a.jpg"), saved.images());
        var created = service.saveRoom(hotel, null,
                new RoomWrite("N1", -1, Long.valueOf(saved.id()), "Ghi chú", true));
        assertEquals("Ghi chú", created.notes());
        assertEquals("AVAILABLE", created.operationalStatus());
        assertEquals("CLEAN", created.housekeepingStatus());
        jdbc.update(
                "UPDATE inventory.rooms SET operational_status='OCCUPIED',housekeeping_status='DIRTY' WHERE room_id=?",
                Long.valueOf(created.id()));
        entityManager.clear();
        var updated = service.saveRoom(hotel, Long.valueOf(created.id()),
                new RoomWrite("N2", 0, Long.valueOf(saved.id()), "Mới", true));
        assertEquals("OCCUPIED", updated.operationalStatus());
        assertEquals("DIRTY", updated.housekeepingStatus());
    }

    @Test
    void duplicateAndReferencedDeletesFailAtDatabase() {
        assertThrows(RuntimeException.class,
                () -> service.saveRoom(hotel, null, new RoomWrite("T1", 1, type, "", true)));
        // Trigger THROW may doom transaction; rollback/restart before the independent FK check.
    }

    @Test
    void bookingReferencePreventsHardDelete() {
        booking("CANCELLED", in, out, 0);
        assertThrows(RuntimeException.class, () -> service.delete(hotel, "rooms", room));
    }
}
