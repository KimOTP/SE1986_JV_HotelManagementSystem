package com.hotel.hms.operations.controller;

import com.hotel.hms.operations.dto.IssueTypeResponse;
import com.hotel.hms.operations.service.IssueTypeService;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@PreAuthorize("isAuthenticated()")
@RequestMapping("/api/operations/issue-types")
public class IssueTypeController {

    private final IssueTypeService service;

    public IssueTypeController(IssueTypeService service) {
        this.service = service;
    }

    @GetMapping
    public List<IssueTypeResponse> getActiveIssueTypes() {
        return service.getActiveIssueTypes();
    }
}
