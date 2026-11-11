package com.hotel.hms.operations.dto;

import java.time.LocalDateTime;
import java.util.List;

public record FeedbackResponse(
        Long id,
        Long bookingId,
        String bookingCode,
        String hotelName,
        String guestName,
        int rating,
        String comment,
        String reply,
        String repliedBy,
        LocalDateTime repliedAt,
        LocalDateTime createdAt,
        List<String> rooms) {
    public FeedbackResponse withRooms(List<String> rooms) {
        return new FeedbackResponse(
                id,
                bookingId,
                bookingCode,
                hotelName,
                guestName,
                rating,
                comment,
                reply,
                repliedBy,
                repliedAt,
                createdAt,
                rooms);
    }
}
