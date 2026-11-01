package com.hotel.hms.frontdesk.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.*;
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ReservationResponse {
    private String id;
    private Long bookingId;
    private String guestName;
    private String phone;
    private String roomNumber;
    private String roomType;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer guests;
    private BigDecimal depositRequired;
    private BigDecimal depositPaid;
    private BigDecimal pricePerNight;
    private String status;
    private LocalDateTime actualCheckIn;
    private LocalDateTime actualCheckOut;
    private List<RoomResponse> rooms;
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RoomResponse {
        private Long bookingRoomId;
        private String roomNumber;
        private String roomType;
        private BigDecimal nightlyRate;
        private String operationalStatus;
        private String housekeepingStatus;
    }
}
