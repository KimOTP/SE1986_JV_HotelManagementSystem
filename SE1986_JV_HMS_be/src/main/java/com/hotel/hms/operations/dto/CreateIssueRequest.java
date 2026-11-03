package com.hotel.hms.operations.dto;

import jakarta.validation.constraints.*;

public record CreateIssueRequest(
        @NotNull @Positive Long roomId,
        @NotNull @Positive Long issueTypeId,
        @NotBlank @Size(max = 200) String title,
        @NotBlank @Size(min = 5, max = 2000) String description,
        @NotNull @Pattern(regexp = "LOW|NORMAL|HIGH|URGENT") String priority
) {
    public CreateIssueRequest {
        title = title == null ? null : title.trim();
        description = description == null ? null : description.trim();
    }
}
