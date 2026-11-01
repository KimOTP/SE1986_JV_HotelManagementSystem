package com.hotel.hms.frontdesk.dto;

import java.math.BigDecimal;
import jakarta.validation.constraints.*;
import lombok.*;
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class InvoiceItemInput {
    @NotBlank private String type;
    private Long bookingRoomId;
    private Long serviceOrderId;
    @NotBlank @Size(max=500) private String description;
    @NotNull @DecimalMin(value="0.01") private BigDecimal quantity;
    @NotNull @DecimalMin(value="0.0") private BigDecimal unitPrice;
}
