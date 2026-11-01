package com.hotel.hms.frontdesk.dto;
import java.math.BigDecimal;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class InvoiceSaveRequest {
    @NotBlank private String bookingId;
    @Valid @NotEmpty private List<InvoiceItemInput> items;
    @DecimalMin("0.0") private BigDecimal discount;
    @DecimalMin("0.0") @DecimalMax("100.0") private BigDecimal taxRate;
    @Size(max=1000) private String note;
    private String rowVersion;
}
