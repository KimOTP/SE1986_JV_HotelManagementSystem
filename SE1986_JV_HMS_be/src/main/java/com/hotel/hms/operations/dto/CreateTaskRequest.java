package com.hotel.hms.operations.dto;

import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public record CreateTaskRequest(
        @NotNull @Positive Long roomId,
        @NotNull @Positive Long staffId,
        @NotNull @Pattern(regexp = "CLEANING|MAINTENANCE") String taskType,
        @NotBlank @Size(max = 200) String title,
        @Size(max = 2000) String description,
        @NotNull @Pattern(regexp = "LOW|NORMAL|HIGH|URGENT") String priority,
        @NotNull LocalDateTime scheduledAt) {
    public CreateTaskRequest {
        title = title == null ? null : title.trim();
        description = description == null || description.isBlank() ? null : description.trim();
    }

    @AssertTrue(message = "Scheduled time must be in SQL Server DATETIME2 year range 1-9999")
    public boolean isScheduledTimeSupported() {
        return scheduledAt == null || (scheduledAt.getYear() >= 1 && scheduledAt.getYear() <= 9999);
    }
}
