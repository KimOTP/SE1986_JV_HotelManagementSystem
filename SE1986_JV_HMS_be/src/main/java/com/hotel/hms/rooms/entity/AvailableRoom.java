package com.hotel.hms.rooms.entity;

/** Read-only JDBC projection of a physical room returned by search_available_rooms.
 * This is not a second JPA mapping of another module's room entity.
 */
public record AvailableRoom(long roomId, long roomTypeId) {}
