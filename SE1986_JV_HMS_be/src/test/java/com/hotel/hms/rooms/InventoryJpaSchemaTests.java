package com.hotel.hms.rooms;

import com.hotel.hms.rooms.entity.*;
import com.hotel.hms.rooms.repository.InventoryReferenceRepository;
import com.hotel.hms.rooms.repository.*;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Explicit opt-in: metadata validation and a verified SELECT-only procedure, no fixtures or writes. */
@EnabledIfSystemProperty(named = "inventory.verify-local-schema", matches = "true")
class InventoryJpaSchemaTests {
    @Test
    void validateLocalSchemaAndReadProcedureWithoutChangingData() throws Exception {
        var local = new Properties();
        if (Files.exists(Path.of(".env"))) {
            try (var reader = Files.newBufferedReader(Path.of(".env"), StandardCharsets.UTF_8)) {
                local.load(reader);
            }
        }
        var dataSource = new DriverManagerDataSource("jdbc:sqlserver://"
                + setting(local, "DB_HOST", "localhost") + ":" + setting(local, "DB_PORT", "1433")
                + ";databaseName=HotelManagement_SBA;encrypt=true;trustServerCertificate=true;loginTimeout=5",
                setting(local, "DB_USERNAME", ""), setting(local, "DB_PASSWORD", ""));
        String actualDefinition;
        try (var connection = dataSource.getConnection();
                var statement = connection.createStatement();
                var result = statement.executeQuery(
                        "SELECT OBJECT_DEFINITION(OBJECT_ID('inventory.search_available_rooms'))")) {
            assertTrue(result.next());
            actualDefinition = result.getString(1);
        }
        String schema = Files.readString(Path.of("docs/sql/01_schema_complete_module_b.sql"),
                StandardCharsets.UTF_8);
        String procedure = schema
                .substring(schema.indexOf("CREATE OR ALTER PROCEDURE inventory.search_available_rooms"));
        procedure = procedure.split("(?im)^GO\\s*$", 2)[0];
        // Refuse to invoke a changed procedure on the shared/local DB without checking its behavior.
        assertNotNull(actualDefinition, "Procedure definition must be readable for verification");
        assertEquals(normalize(procedure), normalize(actualDefinition),
                "Local procedure differs from reviewed SELECT-only DDL");

        var registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.connection.datasource", dataSource)
                .applySetting("hibernate.hbm2ddl.auto", "validate").build();
        try {
            var sources = new MetadataSources(registry);
            List.of(RoomType.class, Room.class, Amenity.class, RoomTypeImage.class, RoomImage.class)
                    .forEach(sources::addAnnotatedClass);
            try (var factory = sources.buildMetadata().buildSessionFactory();
                    var em = factory.createEntityManager()) {
                em.unwrap(org.hibernate.Session.class).setDefaultReadOnly(true);
                long hotel = Long.parseLong(setting(local, "INVENTORY_DEFAULT_HOTEL_ID", "0"));
                assertTrue(hotel > 0, "Configure the intended active hotel explicitly");
                var references = new InventoryReferenceRepository(em);
                var repositories = new JpaRepositoryFactory(em);
                var catalog = new InventoryRepository(repositories.getRepository(RoomTypeRepository.class),
                        repositories.getRepository(RoomRepository.class),
                        repositories.getRepository(AmenityRepository.class),
                        repositories.getRepository(RoomTypeImageRepository.class), references, em, true);
                assertNotNull(catalog.types(hotel, false));
                assertNotNull(catalog.rooms(hotel));
                assertNotNull(catalog.amenities());
                assertNotNull(catalog.publicAmenities(hotel));
                var date = LocalDate.of(2035, 1, 10);
                assertNotNull(references.availableRooms(hotel, date, date.plusDays(2), 1, null));
                var id = (Number) em
                        .createNativeQuery(
                                "SELECT MIN(room_type_id) FROM inventory.room_types WHERE hotel_id=:hotel")
                        .setParameter("hotel", hotel).getSingleResult();
                if (id != null)
                    assertNotNull(
                            references.availableRooms(hotel, date, date.plusDays(2), 1, id.longValue()));
            }
        } finally {
            StandardServiceRegistryBuilder.destroy(registry);
        }
    }

    private String setting(Properties local, String key, String fallback) {
        String value = System.getenv(key);
        return value == null ? local.getProperty(key, fallback) : value;
    }

    private String normalize(String value) {
        return value.replaceAll("(?m)^\\s*--[^\\r\\n]*", "")
                .replaceFirst("(?i)CREATE\\s+OR\\s+ALTER\\s+PROCEDURE", "CREATE PROCEDURE")
                .replaceFirst("(?i)^\\s*ALTER\\s+PROCEDURE", "CREATE PROCEDURE").replaceAll("\\s+", "")
                .toUpperCase(Locale.ROOT);
    }
}
