package com.hotel.hms.rooms;

import com.hotel.hms.rooms.entity.*;
import com.hotel.hms.rooms.repository.*;
import jakarta.persistence.*;
import org.hibernate.SessionFactory;
import org.hibernate.boot.MetadataSources;
import org.hibernate.boot.registry.StandardServiceRegistry;
import org.hibernate.boot.registry.StandardServiceRegistryBuilder;
import org.hibernate.generator.EventType;
import org.hibernate.id.insert.GetGeneratedKeysDelegate;
import org.hibernate.persister.entity.AbstractEntityPersister;
import org.junit.jupiter.api.*;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

/** Build the real Hibernate metadata/query model without connecting to or creating a database. */
class InventoryJpaMappingTests {
    static StandardServiceRegistry registry;
    static SessionFactory factory;
    static final List<Class<?>> ENTITIES = List.of(RoomType.class, Room.class, Amenity.class,
            RoomTypeImage.class, RoomImage.class);

    @BeforeAll
    static void mapping() {
        registry = new StandardServiceRegistryBuilder()
                .applySetting("hibernate.dialect", "org.hibernate.dialect.SQLServerDialect")
                .applySetting("hibernate.boot.allow_jdbc_metadata_access", false)
                .applySetting("hibernate.hbm2ddl.auto", "none")
                .applySetting("hibernate.jdbc.use_get_generated_keys", true).build();
        var sources = new MetadataSources(registry);
        ENTITIES.forEach(sources::addAnnotatedClass);
        factory = sources.buildMetadata().buildSessionFactory();
    }

    @AfterAll
    static void close() {
        if (factory != null)
            factory.close();
        if (registry != null)
            StandardServiceRegistryBuilder.destroy(registry);
    }

    @Test
    void repositoryQueriesAndEntityGraphsResolveAgainstModuleOwnedEntities() {
        try (var em = factory.createEntityManager()) {
            var repositories = new JpaRepositoryFactory(em);
            assertNotNull(repositories.getRepository(RoomTypeRepository.class));
            assertNotNull(repositories.getRepository(RoomRepository.class));
            assertNotNull(repositories.getRepository(AmenityRepository.class));
            assertNotNull(repositories.getRepository(RoomTypeImageRepository.class));
            assertNotNull(repositories.getRepository(RoomImageRepository.class));
        }
    }

    @Test
    void sqlServerIdentityUsesJdbcKeysWithoutOutputInsertedOrGeneratedRowversion() {
        var mapping = factory.unwrap(org.hibernate.engine.spi.SessionFactoryImplementor.class)
                .getMappingMetamodel();
        for (Class<?> entity : ENTITIES) {
            var persister = (AbstractEntityPersister) mapping.getEntityDescriptor(entity);
            assertInstanceOf(GetGeneratedKeysDelegate.class, persister.getInsertDelegate(), entity.getName());
            assertFalse(persister.isVersioned(), "ROWVERSION is read-only, not a numeric version");
            assertTrue(persister.getGeneratedProperties(EventType.UPDATE).isEmpty());
        }
    }

    @Test
    void operationalFieldsRowversionAndHotelOwnershipCannotBeUpdatedByCatalog() throws Exception {
        for (String name : List.of("operationalStatus", "housekeepingStatus")) {
            var column = Room.class.getDeclaredField(name).getAnnotation(Column.class);
            assertFalse(column.insertable());
            assertFalse(column.updatable());
        }
        var version = CatalogAudit.class.getDeclaredField("rowVersion").getAnnotation(Column.class);
        assertFalse(version.insertable());
        assertFalse(version.updatable());
        assertFalse(RoomType.class.getDeclaredField("hotelId").getAnnotation(Column.class).updatable());
        assertEquals(0, RoomType.class.getDeclaredField("amenities").getAnnotation(ManyToMany.class)
                .cascade().length);
        assertEquals(0,
                Room.class.getDeclaredField("roomType").getAnnotation(ManyToOne.class).cascade().length);
        assertEquals(0, RoomTypeImage.class.getDeclaredField("roomType").getAnnotation(ManyToOne.class)
                .cascade().length);
        assertEquals(0,
                RoomImage.class.getDeclaredField("room").getAnnotation(ManyToOne.class).cascade().length);
    }
}
