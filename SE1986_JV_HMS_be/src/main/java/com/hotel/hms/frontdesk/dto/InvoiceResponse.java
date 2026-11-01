package com.hotel.hms.frontdesk.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import lombok.*;
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class InvoiceResponse {
    private String id;
    private Long invoiceId;
    private String bookingId;
    private String guestName;
    private String roomNumber;
    private LocalDateTime issuedAt;
    private String status;
    private BigDecimal discount;
    private BigDecimal taxRate;
    private BigDecimal tax;
    private BigDecimal deposit;
    private BigDecimal subtotal;
    private BigDecimal total;
    private BigDecimal due;
    private String paymentMethod;
    private String note;
    private String rowVersion;
    private List<Item> items;
    @Data @NoArgsConstructor @AllArgsConstructor @Builder
    public static class Item {
        private Long id;
        private String type;
        private Long bookingRoomId;
        private Long serviceOrderId;
        private String description;
        private BigDecimal quantity;
        private BigDecimal unitPrice;
        private BigDecimal lineTotal;
    }
}