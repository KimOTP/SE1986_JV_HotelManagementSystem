package com.hotel.hms.rooms.repository;

import com.hotel.hms.rooms.dto.AvailableRoom;
import com.hotel.hms.rooms.entity.*;
import com.hotel.hms.rooms.service.InventoryMapper;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.*;
import static com.hotel.hms.rooms.dto.InventoryDtos.*;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/** Module B persistence facade. Catalog writes use Spring Data JPA repositories. */
@Repository
public class InventoryRepository {
    private final RoomTypeRepository roomTypes;
    private final RoomRepository rooms;
    private final AmenityRepository amenities;
    private final RoomTypeImageRepository images;
    private final InventoryReferenceRepository references;
    private final EntityManager entityManager;
    private final boolean extensions;

    public InventoryRepository(RoomTypeRepository roomTypes, RoomRepository rooms,
            AmenityRepository amenities, RoomTypeImageRepository images,
            InventoryReferenceRepository references, EntityManager entityManager,
            @Value("${inventory.extensions-enabled:${INVENTORY_EXTENSIONS_ENABLED:false}}") boolean extensions) {
        this.roomTypes = roomTypes;
        this.rooms = rooms;
        this.amenities = amenities;
        this.images = images;
        this.references = references;
        this.entityManager = entityManager;
        this.extensions = extensions;
    }

    public List<RoomTypeView> types(long hotel, boolean publicOnly) {
        Map<Long, List<String>> urls = new HashMap<>();
        if (extensions)
            images.findByRoomTypeHotelIdOrderByRoomTypeIdAscSortOrderAsc(hotel)
                    .forEach(image -> urls
                            .computeIfAbsent(image.getRoomType().getId(), key -> new ArrayList<>())
                            .add(image.getImageUrl()));
        // Amenities are fetched together; images use a second batch query, avoiding N+1/bag joins.
        return roomTypes.findByHotelIdOrderByBasePriceAscIdAsc(hotel).stream()
                .filter(type -> !publicOnly || type.isActive())
                .map(type -> InventoryMapper.roomType(type, urls.getOrDefault(type.getId(), List.of())))
                .toList();
    }

    public List<AmenityView> amenities() {
        return amenities.findAllByOrderByNameAsc().stream().map(InventoryMapper::amenity).toList();
    }

    public List<AmenityView> publicAmenities(long hotel) {
        return amenities.findPublicCatalog(hotel).stream().map(InventoryMapper::amenity).toList();
    }

    public List<RoomView> rooms(long hotel) {
        return rooms.findByRoomTypeHotelIdOrderByFloorAscRoomNumberAsc(hotel).stream()
                .map(room -> InventoryMapper.room(room, extensions)).toList();
    }

    public boolean extensionsEnabled() {
        return extensions;
    }

    public List<AvailableRoom> availableRooms(long hotel, LocalDate in, LocalDate out, int guests,
            Long typeId) {
        return references.availableRooms(hotel, in, out, guests, typeId);
    }

    public List<Boolean> amenityActivityForUpdate(long id) {
        return amenities.findActivityForUpdate(id);
    }

    public boolean hasLiveBookings(long id) {
        return references.hasLiveBookings(id);
    }

    public boolean hasRooms(long id) {
        return rooms.existsByRoomTypeId(id);
    }

    public void lockHotel(long hotel) {
        references.lockHotel(hotel);
    }

    public long persistType(long hotel, Long id, RoomTypeWrite input) {
        RoomType type = id == null ? new RoomType()
                : roomTypes.findByIdAndHotelId(id, hotel).orElseThrow(
                        () -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy loại phòng."));
        if (id == null)
            type.setHotelId(hotel);
        type.setName(input.name());
        type.setDescription(input.description());
        type.setBasePrice(input.basePrice());
        type.setCapacity(input.capacity());
        type.setArea(input.area());
        type.setBedType(input.bedType());
        type.setActive(input.isActive());
        type.getAmenities().clear();
        type.getAmenities().addAll(amenities.findAllById(new LinkedHashSet<>(input.amenityIds())));
        // Only ID is database-generated in Hibernate metadata; standard IDENTITY uses JDBC generated keys.
        type = roomTypes.saveAndFlush(type);
        if (extensions) {
            // Flush deletion before reusing unique (room_type_id,sort_order) values.
            images.deleteForType(type.getId());
            List<RoomTypeImage> replacements = new ArrayList<>();
            for (int i = 0; i < input.images().size(); i++) {
                var image = new RoomTypeImage();
                image.setRoomType(type);
                image.setImageUrl(input.images().get(i));
                image.setSortOrder(i);
                replacements.add(image);
            }
            images.saveAllAndFlush(replacements);
        }
        return type.getId();
    }

    public long persistRoom(Long id, RoomWrite input) {
        Room room = id == null ? new Room()
                : rooms.findById(id)
                        .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy phòng."));
        room.setRoomType(roomTypes.getReferenceById(input.roomTypeId()));
        room.setRoomNumber(input.roomNumber());
        room.setFloor(input.floor());
        room.setActive(input.isActive());
        if (extensions)
            room.setNotes(input.notes());
        room = rooms.saveAndFlush(room);
        // Load DB default statuses/audit after insert; those columns are excluded from catalog writes.
        if (id == null)
            entityManager.refresh(room);
        return room.getId();
    }

    public long persistAmenity(Long id, AmenityWrite input) {
        Amenity amenity = id == null ? new Amenity()
                : amenities.findById(id).orElseThrow(
                        () -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy tiện nghi."));
        amenity.setName(input.name());
        amenity.setDescription(input.description());
        amenity.setActive(input.isActive());
        return amenities.saveAndFlush(amenity).getId();
    }

    public void deleteType(long hotel, long id) {
        RoomType type = roomTypes.findByIdAndHotelId(id, hotel)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy loại phòng."));
        if (extensions)
            images.deleteForType(id);
        type.getAmenities().clear();
        roomTypes.delete(type);
        roomTypes.flush();
    }

    public void deleteRoom(long id) {
        rooms.deleteById(id);
        rooms.flush();
    }

    public void deleteAmenity(long id) {
        amenities.deleteById(id);
        amenities.flush();
    }
}
