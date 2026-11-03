package com.hotel.hms.operations.dto;
import java.time.LocalDate;
public record FeedbackBookingResponse(Long id, String bookingCode, String hotelName, LocalDate checkOutDate) {}
