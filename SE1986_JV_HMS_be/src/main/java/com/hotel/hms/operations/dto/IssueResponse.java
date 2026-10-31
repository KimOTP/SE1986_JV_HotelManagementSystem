package com.hotel.hms.operations.dto;

import java.time.LocalDateTime;

public record IssueResponse(
        Long id, Long roomId, String roomNumber,
        Long issueTypeId, String category,
        String title, String description, String priority, String status,
        Long reportedById, String reportedBy,
        Long assignedStaffId, String assignedTo,
        LocalDateTime createdAt, String resolutionNote, LocalDateTime resolvedAt
) {}
