package com.hotel.hms.frontdesk.dto;

import java.math.BigDecimal;
import java.util.List;
import lombok.*;
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class InvoiceDraftResponse {
    private String bookingId;
    private String guestName;
    private String roomNumber;
    private BigDecimal deposit;
    private List<InvoiceItemInput> items;
}
