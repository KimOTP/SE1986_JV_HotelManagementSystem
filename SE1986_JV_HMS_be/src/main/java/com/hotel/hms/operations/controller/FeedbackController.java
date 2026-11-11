package com.hotel.hms.operations.controller;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.service.FeedbackService;

import jakarta.validation.Valid;

import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@PreAuthorize("isAuthenticated()")
@RequestMapping("/api/operations")
public class FeedbackController {
    private final FeedbackService service;

    public FeedbackController(FeedbackService service) {
        this.service = service;
    }

    private void validatePaging(int page, int size) {
        if (page < 0 || size < 1 || size > 100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination");
    }

    @GetMapping("/feedback-customer-context")
    @PreAuthorize("hasAuthority('UC-E6')")
    public FeedbackContext context() {
        return service.getContext();
    }

    @GetMapping("/feedback-bookings")
    @PreAuthorize("hasAuthority('UC-E6')")
    public List<FeedbackBookingResponse> bookings() {
        return service.eligibleBookings();
    }

    @GetMapping("/my-feedback")
    @PreAuthorize("hasAuthority('UC-E6')")
    public List<FeedbackResponse> mine(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "") String bookingCode) {
        validatePaging(page, size);
        return service.myFeedback(page, size, bookingCode.trim());
    }

    @GetMapping("/feedback")
    @PreAuthorize("hasAuthority('UC-E6')")
    public List<FeedbackResponse> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(defaultValue = "0") int rating,
            @RequestParam(defaultValue = "") String status) {
        validatePaging(page, size);
        if (rating < 0 || rating > 5 || !List.of("", "PENDING", "REPLIED").contains(status))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid feedback filters");
        return service.managedFeedback(page, size, rating, status);
    }

    @PostMapping("/feedback")
    @PreAuthorize("hasAuthority('UC-E6')")
    public ResponseEntity<Map<String, Long>> create(
            @Valid @RequestBody CreateFeedbackRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("id", service.create(request)));
    }

    @PatchMapping("/feedback/{id}/reply")
    @PreAuthorize("hasAuthority('UC-E6')")
    public Map<String, Long> reply(
            @PathVariable Long id, @Valid @RequestBody ReplyFeedbackRequest request) {
        service.reply(id, request);
        return Map.of("id", id);
    }
}
