package com.hotel.hms.operations.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import com.hotel.hms.operations.dto.IssueResponse;
import com.hotel.hms.operations.service.IssueService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@PreAuthorize("isAuthenticated()")
@RequestMapping("/api/operations/issues")
public class IssueController {
    private final IssueService service;
    public IssueController(IssueService service) {
        this.service = service;
    }
    @GetMapping
    @PreAuthorize("hasAuthority('UC-E5')")
    public List<IssueResponse> getIssues(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "") String room,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "") String category) {
        if (page < 0 || size < 1 || size > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "page must be >= 0; size must be between 1 and 100");
        }
        if (!status.isBlank() && !List.of("OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "CLOSED").contains(status.trim())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid issue status");
        }
        return service.getIssues(page, size, room, status, category);
    }
}
