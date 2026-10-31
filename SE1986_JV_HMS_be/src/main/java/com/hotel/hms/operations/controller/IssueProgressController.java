package com.hotel.hms.operations.controller;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.service.IssueProgressService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/operations")
public class IssueProgressController {
    private final IssueProgressService service;
    public IssueProgressController(IssueProgressService service) { this.service = service; }
    @GetMapping("/issue-work-context")
    public IssueWorkContext getContext() { return service.getContext(); }
    @PatchMapping("/issues/{id}/start")
    public IssueProgressResponse start(@PathVariable Long id) { return service.start(id); }
    @PatchMapping("/issues/{id}/resolve")
    public IssueProgressResponse resolve(@PathVariable Long id, @Valid @RequestBody ResolveIssueRequest request) {
        return service.resolve(id, request);
    }
}
