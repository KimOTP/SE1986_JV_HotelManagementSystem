package com.hotel.hms.operations.dto;

import java.time.LocalDateTime;

public record ManagedTaskResponse(Long id, String roomNumber, String hotelName,
        String taskType, String title, String description, String priority, String status,
        Long assignedStaffId, String assignedTo, String assignedBy,
        LocalDateTime scheduledAt) {}
