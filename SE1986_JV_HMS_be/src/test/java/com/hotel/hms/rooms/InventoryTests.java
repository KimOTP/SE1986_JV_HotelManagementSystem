package com.hotel.hms.rooms;

import com.hotel.hms.rooms.dto.InventoryDtos;
import com.hotel.hms.rooms.controller.InventoryExceptionHandler;
import com.hotel.hms.rooms.service.InventoryMapper;
import com.hotel.hms.rooms.repository.InventoryRepository;
import com.hotel.hms.rooms.security.InventoryScope;
import com.hotel.hms.rooms.service.InventoryService;

import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.*;
import static com.hotel.hms.rooms.dto.InventoryDtos.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InventoryTests {
    @Test
    void databaseIconRoundTripsIncludingUnknownLegacyValue() {
        var icons = Map.of("wifi", "Wifi", "snow", "Snow", "tv", "Tv", "water", "Droplet", "cup-hot",
                "CupHot", "shield-lock", "ShieldLock", "sun", "Sun", "legacy-icon", "legacy-icon");
        icons.forEach((db, ui) -> {
            assertEquals(ui, InventoryMapper.iconToUi(db));
            assertEquals(db, InventoryMapper.iconToDb(ui));
        });
    }

    @Test
    void mapPrioritizesMaintenanceAndOccupiedAndTreatsCleaningAsDirty() {
        assertEquals("MAINTENANCE", InventoryMapper.displayStatus("MAINTENANCE", "CLEANING"));
        assertEquals("OCCUPIED", InventoryMapper.displayStatus("OCCUPIED", "DIRTY"));
        assertEquals("DIRTY", InventoryMapper.displayStatus("AVAILABLE", "DIRTY"));
        assertEquals("DIRTY", InventoryMapper.displayStatus("AVAILABLE", "CLEANING"));
        assertEquals("READY", InventoryMapper.displayStatus("AVAILABLE", "CLEAN"));
    }

    @Test
    void validatesHalfOpenDatesWithoutBanningPastDates() {
        LocalDate start = LocalDate.of(2020, 1, 1);
        assertDoesNotThrow(() -> InventoryService.validateDates(start, start.plusDays(1), 1));
        assertThrows(ResponseStatusException.class, () -> InventoryService.validateDates(start, start, 1));
        assertThrows(ResponseStatusException.class,
                () -> InventoryService.validateDates(start, start.minusDays(1), 1));
        assertThrows(ResponseStatusException.class,
                () -> InventoryService.validateDates(start, start.plusDays(1), 0));
    }

    @Test
    void dtoRejectsOverflowFractionsAndInvalidReferences() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var valid = new RoomTypeWrite("  Standard  ", "", new BigDecimal("1.20"), 2,
                    new BigDecimal("12.50"), "Double", List.of(), List.of(1L), true);
            assertEquals("Standard", valid.name());
            assertTrue(validator.validate(valid).isEmpty());
            var invalid = new RoomTypeWrite(" ", "x".repeat(2001), new BigDecimal("1.001"), 0,
                    new BigDecimal("1000000"), "x".repeat(151),
                    Collections.nCopies(7, "https://example.com/a"), List.of(-1L), true);
            assertTrue(validator.validate(invalid).size() >= 7);
            assertFalse(validator.validate(new RoomWrite("x".repeat(21), 0, 1L, "", true)).isEmpty());
            assertTrue(validator.validate(new RoomWrite(" 101 ", -1, 1L, "", true)).isEmpty());
            assertFalse(validator.validate(new AmenityWrite(" ", "é", "x".repeat(501), true)).isEmpty());
        }
    }

    @Test
    void imageUrlOnlyAllowsHttpAndHttps() {
        assertTrue(InventoryService.validImage("https://example.com/room.jpg"));
        assertFalse(InventoryService.validImage("javascript:alert(1)"));
        assertFalse(InventoryService.validImage("https://user:password@example.com/a"));
    }

    @Test
    void triggerAndForeignKeyFailuresAreSafeConflicts() {
        var handler = new InventoryExceptionHandler();
        for (int code : List.of(2601, 2627, 547, 51001, 51002, 1205)) {
            var response = handler.database(new org.springframework.dao.DataIntegrityViolationException(
                    "private SQL", new SQLException("private SQL", "S0001", code)));
            assertEquals(409, response.getStatusCode().value());
            assertFalse(response.getBody().toString().contains("private SQL"));
        }
        assertEquals(500,
                handler.database(new org.springframework.dao.DataAccessResourceFailureException("secret"))
                        .getStatusCode().value());
    }

    @Test
    void publicHotelRequiresExplicitActiveConfiguration() {
        var jdbc = mock(JdbcTemplate.class);
        assertThrows(ResponseStatusException.class, () -> new InventoryScope(jdbc, 0L).publicHotel());
        verifyNoInteractions(jdbc);
        when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(9L))).thenReturn(1);
        assertEquals(9L, new InventoryScope(jdbc, 9L).publicHotel());
    }

    @Test
    void managementUsesMembershipAndAdminWithoutStaffUsesConfiguredHotel() {
        var jdbc = mock(JdbcTemplate.class);
        var principal = mock(com.hotel.hms.identity.security.AuthUserDetails.class);
        when(principal.getId()).thenReturn(2L);
        when(principal.getRoles()).thenReturn(Set.of("ADMIN"));
        var auth = new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(
                principal, null, List.of());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(auth);
        try {
            when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(9L))).thenReturn(1);
            when(jdbc.queryForList(anyString(), eq(Long.class), eq(2L))).thenReturn(List.of());
            assertEquals(9L, new InventoryScope(jdbc, 9L).managementHotel());
            when(principal.getRoles()).thenReturn(Set.of("STAFF"));
            assertThrows(ResponseStatusException.class, () -> new InventoryScope(jdbc, 9L).managementHotel());
            when(jdbc.queryForList(anyString(), eq(Long.class), eq(2L))).thenReturn(List.of(7L));
            when(jdbc.queryForObject(anyString(), eq(Integer.class), eq(7L))).thenReturn(1);
            assertEquals(7L, new InventoryScope(jdbc, 9L).managementHotel());
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
    }

    @Test
    void procedureAdapterCountsDistinctPhysicalRoomsAndDoesNotExposeReservations() {
        var repository = mock(InventoryRepository.class);
        var service = spy(new InventoryService(repository));
        var type = new RoomTypeView("2", "Deluxe", "", BigDecimal.TEN, 2, null, "Double", List.of(),
                List.of(), true, null);
        doReturn(List.of(type)).when(service).types(9L, true);
        LocalDate in = LocalDate.of(2030, 1, 1), out = in.plusDays(1);
        when(repository.availableRooms(9L, in, out, 2, null))
                .thenReturn(List.of(new com.hotel.hms.rooms.dto.AvailableRoom(4L, 2L),
                        new com.hotel.hms.rooms.dto.AvailableRoom(4L, 2L),
                        new com.hotel.hms.rooms.dto.AvailableRoom(5L, 2L)));
        var results = service.search(9L, in, out, 2, null);
        assertEquals(1, results.size());
        assertEquals(2, results.getFirst().availableRooms());
    }
}
