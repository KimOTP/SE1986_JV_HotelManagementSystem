package com.hotel.hms.operations.dto;
import java.time.LocalDate;
import java.util.List;
public record FeedbackBookingResponse(Long id, String bookingCode, String hotelName, LocalDate checkOutDate,
        List<String> rooms) {
    public FeedbackBookingResponse withRooms(List<String> rooms) {
        return new FeedbackBookingResponse(id, bookingCode, hotelName, checkOutDate, rooms);
    }
}
