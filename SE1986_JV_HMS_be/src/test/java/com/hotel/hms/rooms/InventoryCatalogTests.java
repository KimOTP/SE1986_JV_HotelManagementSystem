package com.hotel.hms.rooms;

import com.hotel.hms.rooms.dto.InventoryDtos;
import com.hotel.hms.rooms.repository.InventoryRepository;
import com.hotel.hms.rooms.service.InventoryService;

import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import static com.hotel.hms.rooms.dto.InventoryDtos.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InventoryCatalogTests {
    JdbcTemplate jdbc=mock(JdbcTemplate.class);
    InventoryService service=spy(new InventoryService(new InventoryRepository(jdbc,false)));
    RoomTypeView type=new RoomTypeView("2","Deluxe","",BigDecimal.TEN,2,null,"Double",List.of(),List.of("3"),true,null);
    RoomView room=new RoomView("4","201",2,"2","",true,"OCCUPIED","DIRTY","OCCUPIED");
    @BeforeEach void setup() {
        doReturn(type).when(service).type(1L,2L,false);
        doReturn(room).when(service).room(1L,4L);
    }
    @Test void catalogRoomUpdatePreservesOperationalAndHousekeepingStatus() {
        service.saveRoom(1L,4L,new RoomWrite("202",-1,2L,"",true));
        verify(jdbc).update("UPDATE inventory.rooms SET room_type_id=?,room_number=?,floor_number=?,is_active=?,updated_at=SYSUTCDATETIME() WHERE room_id=?",2L,"202",-1,true,4L);
        verify(jdbc,never()).update(contains("operational_status"),any(Object[].class));
    }
    @Test void missingExtensionsNeverPretendNotesOrImagesWereSaved() {
        assertThrows(ResponseStatusException.class,() -> service.saveRoom(1L,4L,new RoomWrite("201",2,2L,"Note",true)));
        assertThrows(ResponseStatusException.class,() -> service.saveType(1L,2L,new RoomTypeWrite("Deluxe","",BigDecimal.TEN,2,null,"Double",List.of("https://example.com/a.jpg"),List.of(3L),true)));
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
    @Test void inactiveExistingAmenityCanRemainButCannotBeNewlyAssigned() {
        when(jdbc.queryForList(anyString(),eq(Boolean.class),eq(3L))).thenReturn(List.of(false));
        service.saveType(1L,2L,new RoomTypeWrite("Deluxe","",BigDecimal.TEN,2,null,"Double",List.of(),List.of(3L),true));
        when(jdbc.queryForList(anyString(),eq(Boolean.class),eq(5L))).thenReturn(List.of(false));
        assertThrows(ResponseStatusException.class,() -> service.saveType(1L,2L,new RoomTypeWrite("Deluxe","",BigDecimal.TEN,2,null,"Double",List.of(),List.of(5L),true)));
    }
    @Test void missingAmenityAndRoomTypeCannotBeAssigned() {
        when(jdbc.queryForList(anyString(),eq(Boolean.class),eq(9L))).thenReturn(List.of());
        assertThrows(ResponseStatusException.class,() -> service.saveType(1L,2L,new RoomTypeWrite("Deluxe","",BigDecimal.TEN,2,null,"Double",List.of(),List.of(9L),true)));
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND)).when(service).type(1L,99L,false);
        assertThrows(ResponseStatusException.class,() -> service.saveRoom(1L,4L,new RoomWrite("201",2,99L,"",true)));
    }
    @Test void activeBookingsPreventDeactivationAndTypeChange() {
        doReturn(new RoomView("4","201",2,"2","",true,"AVAILABLE","CLEAN","READY")).when(service).room(1L,4L);
        when(jdbc.queryForObject(contains("booking.booking_rooms"),eq(Integer.class),eq(4L))).thenReturn(1);
        assertThrows(ResponseStatusException.class,() -> service.saveRoom(1L,4L,new RoomWrite("201",2,2L,"",false)));
    }
    @Test void referencedTypeCannotBeDeleted() {
        when(jdbc.queryForObject(contains("COUNT(*) FROM inventory.rooms"),eq(Integer.class),eq(2L))).thenReturn(1);
        assertThrows(ResponseStatusException.class,() -> service.delete(1L,"room-types",2L));
        verify(jdbc,never()).update(anyString(),any(Object[].class));
    }
}
