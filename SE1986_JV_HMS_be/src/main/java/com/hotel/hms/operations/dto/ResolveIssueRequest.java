package com.hotel.hms.operations.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResolveIssueRequest(@NotBlank @Size(min = 5, max = 2000) String resolutionNote) {
    public ResolveIssueRequest {
        resolutionNote = resolutionNote == null ? null : resolutionNote.trim();
    }
}
