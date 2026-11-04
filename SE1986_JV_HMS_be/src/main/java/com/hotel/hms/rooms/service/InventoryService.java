package com.hotel.hms.rooms.service;

import com.hotel.hms.rooms.repository.InventoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDate;
import java.util.*;
import static com.hotel.hms.rooms.dto.InventoryDtos.*;
import static org.springframework.http.HttpStatus.*;

/** Catalog rules and transaction boundaries; SQL stays in the inventory repository. */
@Service
@Transactional(readOnly = true)
public class InventoryService {
    private final InventoryRepository repository;

    public InventoryService(InventoryRepository repository) {
        this.repository = repository;
    }

    public List<RoomTypeView> types(long hotel, boolean publicOnly) {
        return repository.types(hotel, publicOnly);
    }

    public RoomTypeView type(long hotel, long id, boolean publicOnly) {
        var found = types(hotel, false).stream().filter(t -> t.id().equals(Long.toString(id))).findFirst()
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy loại phòng."));
        if (publicOnly && !found.isActive())
            throw new ResponseStatusException(GONE, "Loại phòng đã ngừng kinh doanh.");
        return found;
    }

    public List<AmenityView> amenities() {
        return repository.amenities();
    }

    public List<AmenityView> publicAmenities(long hotel) {
        return repository.publicAmenities(hotel);
    }

    public List<RoomView> rooms(long hotel) {
        return repository.rooms(hotel);
    }

    public RoomView room(long hotel, long id) {
        return rooms(hotel).stream().filter(r -> r.id().equals(Long.toString(id))).findFirst()
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy phòng."));
    }

    public List<RoomTypeView> search(long hotel, LocalDate in, LocalDate out, int guests, Long typeId) {
        validateDates(in, out, guests);
        if (typeId != null)
            type(hotel, typeId, true);
        Map<String, Set<String>> counts = new HashMap<>();
        repository.availableRooms(hotel, in, out, guests, typeId)
                .forEach(r -> counts.computeIfAbsent(Long.toString(r.roomTypeId()), k -> new HashSet<>())
                        .add(Long.toString(r.roomId())));
        return types(hotel, true).stream().filter(t -> counts.containsKey(t.id()))
                .map(t -> withCount(t, counts.get(t.id()).size())).toList();
    }

    public RoomTypeView availability(long hotel, long id, LocalDate in, LocalDate out, int guests) {
        var t = type(hotel, id, true);
        return search(hotel, in, out, guests, id).stream().findFirst().orElse(withCount(t, 0));
    }

    public static void validateDates(LocalDate in, LocalDate out, int guests) {
        if (in == null || out == null || !out.isAfter(in) || guests < 1 || in.getYear() < 1
                || out.getYear() > 9999)
            throw new ResponseStatusException(BAD_REQUEST,
                    "Ngày trả phải sau ngày nhận và số khách phải từ 1.");
    }

    private static RoomTypeView withCount(RoomTypeView t, int count) {
        return new RoomTypeView(t.id(), t.name(), t.description(), t.basePrice(), t.capacity(), t.area(),
                t.bedType(), t.images(), t.amenityIds(), t.isActive(), count);
    }

    @Transactional
    public RoomTypeView saveType(long hotel, Long id, RoomTypeWrite input) {
        repository.lockHotel(hotel);
        var old = id == null ? null : type(hotel, id, false);
        if (!repository.extensionsEnabled() && !input.images().isEmpty())
            throw new ResponseStatusException(CONFLICT,
                    "Chưa bật migration lưu ảnh loại phòng; ảnh chưa được lưu.");
        for (Long amenityId : new HashSet<>(input.amenityIds())) {
            var matches = repository.amenityActivityForUpdate(amenityId);
            if (matches.isEmpty())
                throw new ResponseStatusException(BAD_REQUEST, "Tiện nghi không tồn tại.");
            if (!matches.getFirst() && (old == null || !old.amenityIds().contains(amenityId.toString())))
                throw new ResponseStatusException(CONFLICT,
                        "Không thể gán mới tiện nghi đã ngừng hoạt động.");
        }
        for (String url : input.images()) {
            if (!validImage(url))
                throw new ResponseStatusException(BAD_REQUEST,
                        "URL ảnh phải dùng http/https và không có thông tin đăng nhập.");
        }
        return type(hotel, repository.persistType(hotel, id, input), false);
    }

    public static boolean validImage(String value) {
        try {
            var uri = java.net.URI.create(value);
            return ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null && uri.getUserInfo() == null;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    @Transactional
    public RoomView saveRoom(long hotel, Long id, RoomWrite input) {
        repository.lockHotel(hotel);
        var old = id == null ? null : room(hotel, id);
        var target = type(hotel, input.roomTypeId(), false);
        if (!target.isActive() && (old == null || !old.roomTypeId().equals(target.id())))
            throw new ResponseStatusException(CONFLICT, "Không thể gán mới loại phòng inactive.");
        if (!repository.extensionsEnabled() && input.notes() != null && !input.notes().isEmpty())
            throw new ResponseStatusException(CONFLICT, "Chưa bật migration notes; ghi chú chưa được lưu.");
        if (old != null && old.isActive() && !input.isActive() && "OCCUPIED".equals(old.operationalStatus()))
            throw new ResponseStatusException(CONFLICT, "Phòng đang có khách không thể ngừng hoạt động.");
        if (old != null && (!old.roomTypeId().equals(target.id()) || (old.isActive() && !input.isActive()))
                && repository.hasLiveBookings(id))
            throw new ResponseStatusException(CONFLICT,
                    "Phòng có booking đang hiệu lực; cần thống nhất xử lý booking trước khi đổi loại/ngừng hoạt động.");
        return room(hotel, repository.persistRoom(id, input));
    }

    @Transactional
    public AmenityView saveAmenity(Long id, AmenityWrite input) {
        if (id != null)
            amenity(id);
        return amenity(repository.persistAmenity(id, input));
    }

    private AmenityView amenity(long id) {
        return amenities().stream().filter(a -> a.id().equals(Long.toString(id))).findFirst()
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Không tìm thấy tiện nghi."));
    }

    @Transactional
    public void delete(long hotel, String kind, long id) {
        repository.lockHotel(hotel);
        switch (kind) {
        case "room-types" -> {
            type(hotel, id, false);
            if (repository.hasRooms(id))
                throw new ResponseStatusException(CONFLICT,
                        "Loại phòng đang có phòng tham chiếu. Hãy ngừng hoạt động thay thế.");
            repository.deleteType(hotel, id);
        }
        case "rooms" -> {
            room(hotel, id);
            repository.deleteRoom(id);
        }
        case "amenities" -> {
            amenity(id);
            repository.deleteAmenity(id);
        }
        default -> throw new ResponseStatusException(NOT_FOUND);
        }
    }

    @Transactional
    public Object active(long hotel, String kind, long id, boolean active) {
        repository.lockHotel(hotel);
        return switch (kind) {
        case "room-types" -> {
            var t = type(hotel, id, false);
            yield saveType(hotel, id,
                    new RoomTypeWrite(t.name(), t.description(), t.basePrice(), t.capacity(), t.area(),
                            t.bedType(), t.images(), t.amenityIds().stream().map(Long::valueOf).toList(),
                            active));
        }
        case "rooms" -> {
            var r = room(hotel, id);
            yield saveRoom(hotel, id, new RoomWrite(r.roomNumber(), r.floor(), Long.valueOf(r.roomTypeId()),
                    r.notes(), active));
        }
        case "amenities" -> {
            var a = amenity(id);
            yield saveAmenity(id, new AmenityWrite(a.name(), a.iconKey(), a.description(), active));
        }
        default -> throw new ResponseStatusException(NOT_FOUND);
        };
    }
}
