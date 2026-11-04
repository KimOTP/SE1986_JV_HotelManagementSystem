package com.hotel.hms.rooms.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import tools.jackson.databind.annotation.JsonDeserialize;
import com.fasterxml.jackson.annotation.JsonFormat;

public final class InventoryDtos {
    private InventoryDtos() {
    }

    public record RoomTypeWrite(@NotBlank @Size(max = 100) String name, @Size(max = 2000) String description,
            @NotNull @DecimalMin("0") @Digits(integer = 16, fraction = 2) BigDecimal basePrice,
            @NotNull @Min(1) @JsonDeserialize(using = InventoryIntegerDeserializer.class) Integer capacity,
            @DecimalMin(value = "0", inclusive = false) @Digits(integer = 6, fraction = 2) BigDecimal area,
            @Size(max = 150) String bedType,
            @NotNull @Size(max = 6) List<@NotBlank @Size(max = 1000) String> images,
            @NotNull @JsonDeserialize(contentUsing = InventoryIdDeserializer.class) List<@NotNull @Positive Long> amenityIds,
            @NotNull Boolean isActive) {
        public RoomTypeWrite {
            name = name == null ? null : name.trim();
        }
    }

    public record RoomWrite(@NotBlank @Size(max = 20) String roomNumber,
            @NotNull @JsonDeserialize(using = InventoryIntegerDeserializer.class) Integer floor,
            @NotNull @Positive @JsonDeserialize(using = InventoryIdDeserializer.class) Long roomTypeId,
            @Size(max = 2000) String notes, @NotNull Boolean isActive) {
        public RoomWrite {
            roomNumber = roomNumber == null ? null : roomNumber.trim();
        }
    }

    public record AmenityWrite(@NotBlank @Size(max = 100) String name,
            @Size(max = 100) @Pattern(regexp = "[\\x20-\\x7E]*") String iconKey,
            @Size(max = 500) String description, @NotNull Boolean isActive) {
        public AmenityWrite {
            name = name == null ? null : name.trim();
        }
    }

    public record ActiveWrite(@NotNull Boolean isActive) {
    }

    public record RoomTypeView(String id, String name, String description,
            @JsonFormat(shape = JsonFormat.Shape.STRING) BigDecimal basePrice, int capacity, BigDecimal area,
            String bedType, List<String> images, List<String> amenityIds, boolean isActive,
            Integer availableRooms) {
    }

    public record RoomView(String id, String roomNumber, int floor, String roomTypeId, String notes,
            boolean isActive, String operationalStatus, String housekeepingStatus, String displayStatus) {
    }

    public record AmenityView(String id, String name, String iconKey, String description, boolean isActive) {
    }
}
