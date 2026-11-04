package com.hotel.hms.rooms;

import com.hotel.hms.rooms.repository.InventoryRepository;
import com.hotel.hms.rooms.service.InventoryService;
import org.junit.jupiter.api.*;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import static com.hotel.hms.rooms.dto.InventoryDtos.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InventoryCatalogTests {
    InventoryRepository repository = mock(InventoryRepository.class);
    InventoryService service = spy(new InventoryService(repository));
    RoomTypeView type = new RoomTypeView("2", "Deluxe", "", BigDecimal.TEN, 2, null, "Double", List.of(),
            List.of("3"), true, null);
    RoomView room = new RoomView("4", "201", 2, "2", "", true, "OCCUPIED", "DIRTY", "OCCUPIED");

    @BeforeEach
    void setup() {
        doReturn(type).when(service).type(1L, 2L, false);
        doReturn(room).when(service).room(1L, 4L);
        when(repository.persistType(anyLong(), any(), any())).thenReturn(2L);
        when(repository.persistRoom(any(), any())).thenReturn(4L);
    }

    @Test
    void catalogRoomUpdateDelegatesOnlyAllowedWriteDto() {
        var input = new RoomWrite("202", -1, 2L, "", true);
        assertEquals(room, service.saveRoom(1L, 4L, input));
        verify(repository).persistRoom(4L, input);
    }

    @Test
    void missingExtensionsNeverPretendNotesOrImagesWereSaved() {
        assertThrows(ResponseStatusException.class,
                () -> service.saveRoom(1L, 4L, new RoomWrite("201", 2, 2L, "Note", true)));
        assertThrows(ResponseStatusException.class,
                () -> service.saveType(1L, 2L, input(List.of(3L), List.of("https://example.com/a.jpg"))));
        verify(repository, never()).persistRoom(any(), any());
        verify(repository, never()).persistType(anyLong(), any(), any());
    }

    @Test
    void inactiveExistingAmenityCanRemainButCannotBeNewlyAssigned() {
        when(repository.amenityActivityForUpdate(3L)).thenReturn(List.of(false));
        service.saveType(1L, 2L, input(List.of(3L), List.of()));
        when(repository.amenityActivityForUpdate(5L)).thenReturn(List.of(false));
        assertThrows(ResponseStatusException.class,
                () -> service.saveType(1L, 2L, input(List.of(5L), List.of())));
    }

    @Test
    void missingAmenityAndRoomTypeCannotBeAssigned() {
        when(repository.amenityActivityForUpdate(9L)).thenReturn(List.of());
        assertThrows(ResponseStatusException.class,
                () -> service.saveType(1L, 2L, input(List.of(9L), List.of())));
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND)).when(service)
                .type(1L, 99L, false);
        assertThrows(ResponseStatusException.class,
                () -> service.saveRoom(1L, 4L, new RoomWrite("201", 2, 99L, "", true)));
    }

    @Test
    void activeBookingsPreventDeactivationAndTypeChange() {
        doReturn(new RoomView("4", "201", 2, "2", "", true, "AVAILABLE", "CLEAN", "READY")).when(service)
                .room(1L, 4L);
        when(repository.hasLiveBookings(4L)).thenReturn(true);
        assertThrows(ResponseStatusException.class,
                () -> service.saveRoom(1L, 4L, new RoomWrite("201", 2, 2L, "", false)));
        var alternative = new RoomTypeView("7", "Other", "", BigDecimal.TEN, 2, null, "Double", List.of(),
                List.of(), true, null);
        doReturn(alternative).when(service).type(1L, 7L, false);
        assertThrows(ResponseStatusException.class,
                () -> service.saveRoom(1L, 4L, new RoomWrite("201", 2, 7L, "", true)));
        verify(repository, never()).persistRoom(any(), any());
    }

    @Test
    void referencedTypeCannotBeDeleted() {
        when(repository.hasRooms(2L)).thenReturn(true);
        assertThrows(ResponseStatusException.class, () -> service.delete(1L, "room-types", 2L));
        verify(repository, never()).deleteType(anyLong(), anyLong());
    }

    private RoomTypeWrite input(List<Long> amenities, List<String> images) {
        return new RoomTypeWrite("Deluxe", "", BigDecimal.TEN, 2, null, "Double", images, amenities, true);
    }
}
