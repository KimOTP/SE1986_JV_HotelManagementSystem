package com.hotel.hms.rooms.service;

import java.util.List;
import com.hotel.hms.rooms.entity.Amenity;
import com.hotel.hms.rooms.entity.Room;
import com.hotel.hms.rooms.entity.RoomType;
import static com.hotel.hms.rooms.dto.InventoryDtos.*;

public final class InventoryMapper {
    private InventoryMapper() {
    }

    public static RoomTypeView roomType(RoomType type, List<String> images) {
        return new RoomTypeView(type.getId().toString(), type.getName(), text(type.getDescription()),
                type.getBasePrice(), type.getCapacity(), type.getArea(), text(type.getBedType()), images,
                type.getAmenities().stream().map(amenity -> amenity.getId().toString()).sorted().toList(),
                type.isActive(), null);
    }

    public static RoomView room(Room room, boolean includeNotes) {
        return new RoomView(room.getId().toString(), room.getRoomNumber(), room.getFloor(),
                room.getRoomType().getId().toString(), includeNotes ? text(room.getNotes()) : "",
                room.isActive(), room.getOperationalStatus(), room.getHousekeepingStatus(),
                displayStatus(room.getOperationalStatus(), room.getHousekeepingStatus()));
    }

    public static AmenityView amenity(Amenity amenity) {
        return new AmenityView(amenity.getId().toString(), amenity.getName(),
                text(amenity.getDescription()), amenity.isActive());
    }

    private static String text(String value) {
        return value == null ? "" : value;
    }

    public static String displayStatus(String operational, String housekeeping) {
        if ("MAINTENANCE".equals(operational) || "OCCUPIED".equals(operational))
            return operational;
        return "READY";
    }
}
