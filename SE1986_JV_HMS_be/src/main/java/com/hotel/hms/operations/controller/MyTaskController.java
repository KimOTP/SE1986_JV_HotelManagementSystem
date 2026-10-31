package com.hotel.hms.operations.controller;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.service.MyTaskService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;

@RestController
@RequestMapping("/api/operations/my-tasks")
public class MyTaskController {
    private final MyTaskService service;
    public MyTaskController(MyTaskService service) { this.service = service; }
    @GetMapping
    public List<MyTaskResponse> getTasks(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size, @RequestParam(defaultValue = "") String room,
            @RequestParam(defaultValue = "") String status, @RequestParam(defaultValue = "") String type) {
        if (page < 0 || size < 1 || size > 100
                || !List.of("", "PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED").contains(status)
                || !List.of("", "CLEANING", "MAINTENANCE").contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid task filters or page parameters");
        }
        return service.getTasks(page, size, room, status, type);
    }
    @PatchMapping("/{id}/start")
    public TaskProgressResponse start(@PathVariable Long id) { return service.start(id); }
    @PatchMapping("/{id}/complete")
    public TaskProgressResponse complete(@PathVariable Long id) { return service.complete(id); }
}
