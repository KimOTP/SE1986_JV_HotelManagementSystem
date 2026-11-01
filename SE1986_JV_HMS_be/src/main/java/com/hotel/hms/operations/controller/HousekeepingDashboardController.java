package com.hotel.hms.operations.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import com.hotel.hms.operations.dto.HousekeepingDashboardResponse;
import com.hotel.hms.operations.service.HousekeepingDashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@PreAuthorize("isAuthenticated()")
@RequestMapping("/api/operations/dashboard")
public class HousekeepingDashboardController {
    private final HousekeepingDashboardService service;
    public HousekeepingDashboardController(HousekeepingDashboardService service) { this.service = service; }
    @GetMapping
    @PreAuthorize("hasAuthority('UC-E3')")
    public HousekeepingDashboardResponse getDashboard(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "Asia/Bangkok") String zone,
            @RequestParam(defaultValue = "false") boolean allTime) {
        return service.getDashboard(date, zone, allTime);
    }
}
