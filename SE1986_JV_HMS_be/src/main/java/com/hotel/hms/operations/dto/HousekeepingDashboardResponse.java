package com.hotel.hms.operations.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record HousekeepingDashboardResponse(LocalDate date, String zone, boolean allTime, Instant generatedAt,
        Summary summary, List<Workload> workload, List<UrgentTask> urgentTasks, List<OpenIssue> openIssues) {
    public record Summary(long total, long pending, long inProgress, long completed, long cancelled, long highPriorityOpen, long overdue) {}
    public record Workload(Long staffId, String fullName, String employeeCode, String hotelName, boolean active,
            long pending, long inProgress, long completed, long cancelled) {}
    public record UrgentTask(Long id, String roomNumber, String title, String priority, String status,
            String assignedTo, LocalDateTime scheduledAt) {}
    public record OpenIssue(Long id, String roomNumber, String title, String status) {}
}
