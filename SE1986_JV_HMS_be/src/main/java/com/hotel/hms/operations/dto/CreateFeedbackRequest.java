package com.hotel.hms.operations.dto;

import jakarta.validation.constraints.*;

public record CreateFeedbackRequest(
        @NotNull @Positive Long bookingId,
        @NotNull @Min(1) @Max(5) Integer rating,
        @NotBlank @Size(min = 5, max = 2000) String comment) {
    public CreateFeedbackRequest {
        comment = comment == null ? null : comment.trim();
    }
}
