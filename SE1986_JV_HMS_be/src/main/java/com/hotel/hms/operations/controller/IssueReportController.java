package com.hotel.hms.operations.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.service.IssueReportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@PreAuthorize("isAuthenticated()")
@RequestMapping("/api/operations")
public class IssueReportController {
    private final IssueReportService service;
    public IssueReportController(IssueReportService service) { this.service = service; }

    @GetMapping("/issue-rooms")
    @PreAuthorize("hasAuthority('UC-E4')")
    public List<IssueRoomResponse> getRooms() { return service.getRooms(); }

    @GetMapping("/issue-reporting-context")
    @PreAuthorize("hasAuthority('UC-E4')")
    public IssueReportingContext getContext() { return service.getContext(); }

    @PostMapping("/issues")
    @PreAuthorize("hasAuthority('UC-E4')")
    public ResponseEntity<CreatedIssueResponse> create(@Valid @RequestBody CreateIssueRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }
}
