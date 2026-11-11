package com.hotel.hms.operations.controller;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.service.IssueAssignmentService;

import jakarta.validation.Valid;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@PreAuthorize("isAuthenticated()")
@RequestMapping("/api/operations")
public class IssueAssignmentController {
    private final IssueAssignmentService service;

    public IssueAssignmentController(IssueAssignmentService service) {
        this.service = service;
    }

    @GetMapping("/issue-assignment-context")
    public IssueAssignmentContext getContext() {
        return service.getContext();
    }

    @GetMapping("/issues/{id}/assignees")
    @PreAuthorize("hasAuthority('UC-E5')")
    public List<IssueAssigneeResponse> getAssignees(@PathVariable Long id) {
        return service.getAssignees(id);
    }

    @PatchMapping("/issues/{id}/assignment")
    @PreAuthorize("hasAuthority('UC-E5')")
    public IssueAssignmentResponse assign(
            @PathVariable Long id, @Valid @RequestBody AssignIssueRequest request) {
        return service.assign(id, request);
    }
}
