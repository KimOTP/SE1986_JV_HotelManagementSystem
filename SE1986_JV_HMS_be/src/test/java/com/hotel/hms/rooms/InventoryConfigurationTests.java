package com.hotel.hms.rooms;

import com.hotel.hms.rooms.repository.InventoryRepository;
import com.hotel.hms.rooms.security.InventoryScope;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.core.env.MapPropertySource;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InventoryConfigurationTests {
    @Test void uppercasePropertiesFromDotEnvConfigureHotelAndExtensions() {
        try(var context = new AnnotationConfigApplicationContext()) {
            // Imported .env is a properties source, not OS environment variables.
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("dotenv",
                    Map.of("INVENTORY_DEFAULT_HOTEL_ID", "7", "INVENTORY_EXTENSIONS_ENABLED", "true")));
            var jdbc = mock(JdbcTemplate.class);
            context.registerBean(JdbcTemplate.class, () -> jdbc);
            context.register(InventoryScope.class, InventoryRepository.class);
            context.refresh();
            when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(7L))).thenReturn(1);
            assertEquals(7L, context.getBean(InventoryScope.class).publicHotel());
            assertEquals(true, org.springframework.test.util.ReflectionTestUtils.getField(
                    context.getBean(InventoryRepository.class), "extensions"));
        }
    }
}
