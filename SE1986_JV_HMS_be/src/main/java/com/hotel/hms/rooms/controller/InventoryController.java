package com.hotel.hms.rooms.controller;

import com.hotel.hms.rooms.service.InventoryService;
import com.hotel.hms.rooms.security.InventoryScope;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import java.time.LocalDate;
import java.util.*;
import static com.hotel.hms.rooms.dto.InventoryDtos.*;

@RestController
@RequestMapping("/api/inventory")
public class InventoryController {
    private final InventoryService service;
    private final InventoryScope scope;

    public InventoryController(InventoryService service, InventoryScope scope) {
        this.service = service;
        this.scope = scope;
    }

    @GetMapping("/public/catalog")
    public Object catalog() {
        long hotel = scope.publicHotel();
        return Map.of("roomTypes", service.types(hotel, true), "amenities", service.publicAmenities(hotel));
    }

    @GetMapping("/public/room-types/{id}")
    public RoomTypeView detail(@PathVariable @Positive long id) {
        return service.type(scope.publicHotel(), id, true);
    }

    @GetMapping("/public/search")
    public List<RoomTypeView> search(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam @Min(1) int guests) {
        return service.search(scope.publicHotel(), checkIn, checkOut, guests, null);
    }

    @GetMapping("/public/room-types/{id}/availability")
    public RoomTypeView availability(@PathVariable @Positive long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam @Min(1) int guests) {
        return service.availability(scope.publicHotel(), id, checkIn, checkOut, guests);
    }

    @GetMapping("/admin/room-types")
    @PreAuthorize("hasAuthority('UC-B1')")
    public List<RoomTypeView> types() {
        return service.types(scope.managementHotel(), false);
    }

    @GetMapping("/admin/room-types/{id}")
    @PreAuthorize("hasAuthority('UC-B1')")
    public RoomTypeView type(@PathVariable @Positive long id) {
        return service.type(scope.managementHotel(), id, false);
    }

    @GetMapping("/admin/room-types/options")
    @PreAuthorize("hasAuthority('UC-B1')")
    public List<AmenityView> typeOptions() {
        scope.managementHotel();
        return service.amenities();
    }

    @PostMapping("/admin/room-types")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('UC-B1')")
    public RoomTypeView createType(@Valid @RequestBody RoomTypeWrite body) {
        return service.saveType(scope.managementHotel(), null, body);
    }

    @PutMapping("/admin/room-types/{id}")
    @PreAuthorize("hasAuthority('UC-B1')")
    public RoomTypeView updateType(@PathVariable @Positive long id, @Valid @RequestBody RoomTypeWrite body) {
        return service.saveType(scope.managementHotel(), id, body);
    }

    @DeleteMapping("/admin/room-types/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('UC-B1')")
    public void deleteType(@PathVariable @Positive long id) {
        service.delete(scope.managementHotel(), "room-types", id);
    }

    @PatchMapping("/admin/room-types/{id}/active")
    @PreAuthorize("hasAuthority('UC-B1')")
    public Object activeType(@PathVariable @Positive long id, @Valid @RequestBody ActiveWrite body) {
        return service.active(scope.managementHotel(), "room-types", id, body.isActive());
    }

    @GetMapping("/admin/rooms")
    @PreAuthorize("hasAuthority('UC-B2')")
    public List<RoomView> rooms() {
        return service.rooms(scope.managementHotel());
    }

    @GetMapping("/admin/rooms/options")
    @PreAuthorize("hasAuthority('UC-B2')")
    public List<RoomTypeView> roomOptions() {
        return service.types(scope.managementHotel(), false);
    }

    @PostMapping("/admin/rooms")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('UC-B2')")
    public RoomView createRoom(@Valid @RequestBody RoomWrite body) {
        return service.saveRoom(scope.managementHotel(), null, body);
    }

    @PutMapping("/admin/rooms/{id}")
    @PreAuthorize("hasAuthority('UC-B2')")
    public RoomView updateRoom(@PathVariable @Positive long id, @Valid @RequestBody RoomWrite body) {
        return service.saveRoom(scope.managementHotel(), id, body);
    }

    @DeleteMapping("/admin/rooms/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('UC-B2')")
    public void deleteRoom(@PathVariable @Positive long id) {
        service.delete(scope.managementHotel(), "rooms", id);
    }

    @PatchMapping("/admin/rooms/{id}/active")
    @PreAuthorize("hasAuthority('UC-B2')")
    public Object activeRoom(@PathVariable @Positive long id, @Valid @RequestBody ActiveWrite body) {
        return service.active(scope.managementHotel(), "rooms", id, body.isActive());
    }

    @GetMapping("/admin/amenities")
    @PreAuthorize("hasAuthority('UC-B3')")
    public List<AmenityView> amenities() {
        scope.managementHotel();
        return service.amenities();
    }

    @PostMapping("/admin/amenities")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('UC-B3')")
    public AmenityView createAmenity(@Valid @RequestBody AmenityWrite body) {
        scope.managementHotel();
        return service.saveAmenity(null, body);
    }

    @PutMapping("/admin/amenities/{id}")
    @PreAuthorize("hasAuthority('UC-B3')")
    public AmenityView updateAmenity(@PathVariable @Positive long id, @Valid @RequestBody AmenityWrite body) {
        scope.managementHotel();
        return service.saveAmenity(id, body);
    }

    @DeleteMapping("/admin/amenities/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('UC-B3')")
    public void deleteAmenity(@PathVariable @Positive long id) {
        service.delete(scope.managementHotel(), "amenities", id);
    }

    @PatchMapping("/admin/amenities/{id}/active")
    @PreAuthorize("hasAuthority('UC-B3')")
    public Object activeAmenity(@PathVariable @Positive long id, @Valid @RequestBody ActiveWrite body) {
        return service.active(scope.managementHotel(), "amenities", id, body.isActive());
    }

    @GetMapping("/room-map")
    @PreAuthorize("hasAuthority('UC-B6')")
    public Object map() {
        long hotel = scope.managementHotel();
        return Map.of("rooms", service.rooms(hotel), "roomTypes", service.types(hotel, false), "amenities",
                List.of());
    }
}
