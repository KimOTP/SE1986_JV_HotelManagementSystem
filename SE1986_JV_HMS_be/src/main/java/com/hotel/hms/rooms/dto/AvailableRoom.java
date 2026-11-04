package com.hotel.hms.rooms.dto;

/** Read-only procedure result, separate from the persistent catalog entities. */
public record AvailableRoom(long roomId, long roomTypeId) {
}
