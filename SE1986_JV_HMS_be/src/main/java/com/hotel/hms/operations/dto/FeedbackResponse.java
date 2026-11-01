package com.hotel.hms.operations.dto;
import java.time.LocalDateTime;
public record FeedbackResponse(Long id, Long bookingId, String bookingCode, String hotelName, String guestName,
        int rating, String comment, String reply, String repliedBy, LocalDateTime repliedAt, LocalDateTime createdAt) {}
