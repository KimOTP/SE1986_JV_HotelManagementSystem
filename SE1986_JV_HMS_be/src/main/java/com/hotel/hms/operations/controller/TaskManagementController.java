package com.hotel.hms.operations.controller;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.service.TaskManagementService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@PreAuthorize("isAuthenticated()")
@RequestMapping("/api/operations")
public class TaskManagementController {
    private final TaskManagementService service;

    public TaskManagementController(TaskManagementService service) {
        this.service = service;
    }

    @GetMapping("/task-rooms")
    @PreAuthorize("hasAuthority('UC-E1')")
    public List<TaskRoomResponse> getRooms() {
        return service.getRooms();
    }

    @GetMapping("/task-assignees")
    @PreAuthorize("hasAuthority('UC-E1')")
    public List<IssueAssigneeResponse> getAssignees(@RequestParam Long roomId) {
        return service.getAssignees(roomId);
    }

    @GetMapping("/tasks")
    @PreAuthorize("hasAuthority('UC-E1')")
    public List<ManagedTaskResponse> getTasks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "") String room,
            @RequestParam(defaultValue = "") String status,
            @RequestParam(defaultValue = "") String type) {
        if (page < 0
                || size < 1
                || size > 100
                || !List.of("", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED").contains(status)
                || !List.of("", "CLEANING", "MAINTENANCE").contains(type)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid task filters or pagination");
        }
        return service.getTasks(page, size, room, status, type);
    }

    @PostMapping("/tasks")
    @PreAuthorize("hasAuthority('UC-E1')")
    public ResponseEntity<TaskProgressResponse> create(
            @Valid @RequestBody CreateTaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }
}
