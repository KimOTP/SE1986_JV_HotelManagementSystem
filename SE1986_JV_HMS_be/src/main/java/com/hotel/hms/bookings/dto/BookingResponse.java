package com.hotel.hms.bookings.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Result of a successful booking creation.
 *
 * <p>{@code id} is the booking code because the frontend uses it in
 * {@code /bookings/:id}; {@code bookingId} keeps the database identity for
 * clients that need it.</p>
 */
public record BookingResponse(
        Long bookingId,
        String id,
        String bookingCode,
        Long customerId,
        Long hotelId,
        Long roomTypeId,
        String roomTypeName,
        LocalDate checkIn,
        LocalDate checkOut,
        long nights,
        int guests,
        int rooms,
        BigDecimal pricePerNight,
        BigDecimal totalAmount,
        BigDecimal depositRequired,
        BigDecimal depositPaid,
        String status,
        LocalDateTime holdExpiresAt,
        LocalDateTime createdAt,
        String customerName,
        String email,
        String phone,
        String specialRequests,
        List<AssignedRoom> assignedRooms
) {
    public record AssignedRoom(Long roomId, String roomNumber) {
    }
}
