package com.hotel.hms.bookings.controller;

import com.hotel.hms.bookings.dto.BookingResponse;
import com.hotel.hms.bookings.dto.CreateBookingRequest;
import com.hotel.hms.bookings.service.BookingService;
import com.hotel.hms.common.exception.ApiException;
import com.hotel.hms.identity.security.AuthUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService service;

    public BookingController(BookingService service) {
        this.service = service;
    }

    /**
     * UC-C1 – creates a PENDING booking with a short hold.
     *
     * <p>The customer id always comes from the JWT principal, never from the
     * request body.</p>
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('UC-C1')")
    public BookingResponse create(@AuthenticationPrincipal AuthUserDetails currentUser,
                                  @Valid @RequestBody CreateBookingRequest request) {
        if (currentUser == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                    "Vui lòng đăng nhập để tạo đặt phòng.");
        }
        return service.create(currentUser.getId(), request);
    }
}
