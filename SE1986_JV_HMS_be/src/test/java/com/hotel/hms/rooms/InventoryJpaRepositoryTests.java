package com.hotel.hms.rooms;

import com.hotel.hms.rooms.entity.*;
import com.hotel.hms.rooms.repository.*;
import com.hotel.hms.rooms.service.InventoryMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import java.math.BigDecimal;
import java.util.*;
import static com.hotel.hms.rooms.dto.InventoryDtos.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InventoryJpaRepositoryTests {
    RoomTypeRepository types = mock(RoomTypeRepository.class);
    RoomRepository rooms = mock(RoomRepository.class);
    AmenityRepository amenities = mock(AmenityRepository.class);
    RoomTypeImageRepository images = mock(RoomTypeImageRepository.class);
    InventoryReferenceRepository references = mock(InventoryReferenceRepository.class);
    EntityManager entityManager = mock(EntityManager.class);
    InventoryRepository repository = new InventoryRepository(types, rooms, amenities, images, references,
            entityManager, true);

    RoomType type(long id) {
        var type = new RoomType();
        type.setId(id);
        type.setHotelId(1L);
        type.setName("Deluxe");
        type.setBasePrice(new BigDecimal("800000.00"));
        type.setCapacity(2);
        return type;
    }

    @Test
    void roomUpdateUsesJpaAndKeepsOperationalAndHousekeepingValues() {
        var type = type(2L);
        var room = new Room();
        room.setId(4L);
        room.setRoomType(type);
        room.setOperationalStatus("OCCUPIED");
        room.setHousekeepingStatus("CLEANING");
        when(rooms.findById(4L)).thenReturn(Optional.of(room));
        when(types.getReferenceById(2L)).thenReturn(type);
        when(rooms.saveAndFlush(room)).thenReturn(room);
        assertEquals(4L, repository.persistRoom(4L, new RoomWrite("202", -1, 2L, "Ghi chú", true)));
        assertEquals("202", room.getRoomNumber());
        assertEquals(-1, room.getFloor());
        assertEquals("Ghi chú", room.getNotes());
        assertEquals("OCCUPIED", room.getOperationalStatus());
        assertEquals("CLEANING", room.getHousekeepingStatus());
        verify(entityManager, never()).refresh(any());
    }

    @Test
    void newRoomRefreshesDatabaseDefaultsAfterIdentityInsert() {
        when(types.getReferenceById(2L)).thenReturn(type(2L));
        when(rooms.saveAndFlush(any())).thenAnswer(invocation -> {
            Room room = invocation.getArgument(0);
            assertNull(room.getOperationalStatus());
            assertNull(room.getHousekeepingStatus());
            room.setId(5L);
            return room;
        });
        assertEquals(5L, repository.persistRoom(null, new RoomWrite("101", 0, 2L, "", true)));
        verify(entityManager).refresh(any(Room.class));
    }

    @Test
    void typeUpdateKeepsHotelAndReplacesImagesInUniqueSlotOrder() {
        var type = type(2L);
        when(types.findByIdAndHotelId(2L, 1L)).thenReturn(Optional.of(type));
        when(types.saveAndFlush(type)).thenReturn(type);
        when(amenities.findAllById(any())).thenReturn(List.of());
        var input = new RoomTypeWrite("Suite", "Mô tả", BigDecimal.TEN, 3, null, "Đôi",
                List.of("https://example.com/1", "https://example.com/2"), List.of(), true);
        assertEquals(2L, repository.persistType(1L, 2L, input));
        assertEquals(1L, type.getHotelId());
        assertEquals("Suite", type.getName());
        var ordered = inOrder(types, images);
        ordered.verify(types).saveAndFlush(type);
        ordered.verify(images).deleteForType(2L);
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<RoomTypeImage>> saved = ArgumentCaptor.forClass(List.class);
        ordered.verify(images).saveAllAndFlush(saved.capture());
        assertEquals(List.of(0, 1), saved.getValue().stream().map(RoomTypeImage::getSortOrder).toList());
        assertSame(type, saved.getValue().getFirst().getRoomType());
    }

    @Test
    void listMappingBatchesRelationsAndKeepsStringIdsAndDecimal() {
        var type = type(2L);
        var amenity = new Amenity();
        amenity.setId(3L);
        amenity.setName("Wi-Fi");
        type.getAmenities().add(amenity);
        var image = new RoomTypeImage();
        image.setRoomType(type);
        image.setImageUrl("https://example.com/a.jpg");
        when(types.findByHotelIdOrderByBasePriceAscIdAsc(1L)).thenReturn(List.of(type));
        when(images.findByRoomTypeHotelIdOrderByRoomTypeIdAscSortOrderAsc(1L)).thenReturn(List.of(image));
        var result = repository.types(1L, true).getFirst();
        assertEquals("2", result.id());
        assertEquals(List.of("3"), result.amenityIds());
        assertEquals(List.of("https://example.com/a.jpg"), result.images());
        assertEquals(new BigDecimal("800000.00"), result.basePrice());
        assertEquals("Wi-Fi", InventoryMapper.amenity(amenity).name());
        verify(types, times(1)).findByHotelIdOrderByBasePriceAscIdAsc(1L);
        verify(images, times(1)).findByRoomTypeHotelIdOrderByRoomTypeIdAscSortOrderAsc(1L);
    }

    @Test
    void amenityUpdatePersistsNameDescriptionAndActiveState() {
        var amenity = new Amenity();
        amenity.setId(3L);
        when(amenities.findById(3L)).thenReturn(Optional.of(amenity));
        when(amenities.saveAndFlush(amenity)).thenReturn(amenity);
        assertEquals(3L, repository.persistAmenity(3L, new AmenityWrite("New name", "Internet", false)));
        assertEquals("New name", amenity.getName());
        assertEquals("Internet", amenity.getDescription());
        assertFalse(amenity.isActive());
    }
}
