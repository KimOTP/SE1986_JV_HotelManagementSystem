package com.hotel.hms.operations.dto;

import java.time.LocalDateTime;

public record MyTaskResponse(
        Long id,
        String roomNumber,
        Long issueId,
        String taskType,
        String title,
        String description,
        String priority,
        String status,
        LocalDateTime scheduledAt,
        LocalDateTime startedAt,
        LocalDateTime completedAt) {}
