package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.HousekeepingDashboardResponse;
import com.hotel.hms.operations.dto.HousekeepingDashboardResponse.*;
import com.hotel.hms.operations.repository.HousekeepingDashboardRepository;
import com.hotel.hms.operations.repository.HousekeepingDashboardRepository.*;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.*;

@Service
@Transactional(readOnly = true)
public class HousekeepingDashboardService {
    private final HousekeepingDashboardRepository persistence;
    private final IssueAssignmentService managerContext;

    public HousekeepingDashboardService(
            HousekeepingDashboardRepository persistence, IssueAssignmentService managerContext) {
        this.persistence = persistence;
        this.managerContext = managerContext;
    }

    public record DayWindow(LocalDateTime fromUtc, LocalDateTime toUtc) {}

    public static DayWindow dayWindow(LocalDate date, String zoneName) {
        try {
            if (date == null || zoneName == null || date.getYear() < 1 || date.getYear() > 9998)
                throw new DateTimeException("Invalid date or zone");
            var zone = ZoneId.of(zoneName);
            var from =
                    date.atStartOfDay(zone).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
            var to =
                    date.plusDays(1)
                            .atStartOfDay(zone)
                            .withZoneSameInstant(ZoneOffset.UTC)
                            .toLocalDateTime();
            if (from.getYear() < 1 || to.getYear() > 9999)
                throw new DateTimeException("Date outside SQL range");
            return new DayWindow(from, to);
        } catch (DateTimeException | IllegalArgumentException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid dashboard date or time zone");
        }
    }

    public HousekeepingDashboardResponse getDashboard(LocalDate date, String zoneName) {
        return getDashboard(date, zoneName, false);
    }

    public HousekeepingDashboardResponse getDashboard(
            LocalDate date, String zoneName, boolean allTime) {
        var manager = managerContext.requireManager();
        var window = dayWindow(date, zoneName);
        var from = window.fromUtc();
        var to = window.toUtc();
        int admin = manager.admin() ? 1 : 0;
        var summary = persistence.summary(allTime, from, to, admin, manager.id());
        var workload = persistence.workload(allTime, from, to, admin, manager.id());
        var urgent = persistence.urgent(allTime, from, to, admin, manager.id());
        var issues = persistence.openIssues(admin, manager.id());
        return new HousekeepingDashboardResponse(
                date, zoneName, allTime, Instant.now(), summary, workload, urgent, issues);
    }
}
