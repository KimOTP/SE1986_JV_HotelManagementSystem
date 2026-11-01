package com.hotel.hms.frontdesk.dto;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CheckInRequest {
    private String roomNumber;
    private String idNumber;
    private String documentType;
    @Size(max=1000) private String note;
    @Valid private List<RoomGuest> roomGuests;
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RoomGuest {
        private Long bookingRoomId;
        private String roomNumber;
        private String fullName;
        private String idNumber;
        private String documentType;
    }
}
