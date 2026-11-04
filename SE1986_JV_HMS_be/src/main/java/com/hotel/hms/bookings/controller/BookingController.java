package com.hotel.hms.bookings.controller;

import com.hotel.hms.bookings.dto.BookingResponse;
import com.hotel.hms.bookings.dto.CancelBookingRequest;
import com.hotel.hms.bookings.dto.CreateBookingRequest;
import com.hotel.hms.bookings.service.BookingQueryService;
import com.hotel.hms.bookings.service.BookingService;
import com.hotel.hms.common.exception.ApiException;
import com.hotel.hms.identity.security.AuthUserDetails;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService service;
    private final BookingQueryService queryService;

    public BookingController(BookingService service, BookingQueryService queryService) {
        this.service = service;
        this.queryService = queryService;
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
        requireUser(currentUser);
        return service.create(currentUser.getId(), request);
    }

    /**
     * UC-C3 – "Đặt phòng của tôi": bookings of the current customer only, newest
     * first. {@code status} is optional; {@code page} is 0-based.
     */
    @GetMapping
    @PreAuthorize("hasAuthority('UC-C3')")
    public List<BookingResponse> listMine(@AuthenticationPrincipal AuthUserDetails currentUser,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "20") int size,
                                          @RequestParam(defaultValue = "") String status) {
        requireUser(currentUser);
        return queryService.listMine(currentUser.getId(), status, page, size);
    }

    /**
     * UC-C6 – booking detail for the owner. Staff with UC-C5 (quản lý đặt phòng)
     * may open any booking.
     */
    @GetMapping("/{bookingCode}")
    @PreAuthorize("hasAnyAuthority('UC-C6', 'UC-C5')")
    public BookingResponse detail(@AuthenticationPrincipal AuthUserDetails currentUser,
                                  @PathVariable String bookingCode,
                                  Authentication authentication) {
        requireUser(currentUser);
        boolean canViewAnyBooking = authentication.getAuthorities().stream()
                .anyMatch(authority -> "UC-C5".equals(authority.getAuthority()));
        return queryService.getByCode(currentUser.getId(), bookingCode, canViewAnyBooking);
    }

    /**
     * UC-C4 – customer cancels a PENDING or CONFIRMED booking. The reason is
     * optional and is written to the status history.
     */
    @PostMapping("/{bookingCode}/cancel")
    @PreAuthorize("hasAuthority('UC-C4')")
    public BookingResponse cancel(@AuthenticationPrincipal AuthUserDetails currentUser,
                                  @PathVariable String bookingCode,
                                  @Valid @RequestBody(required = false) CancelBookingRequest request) {
        requireUser(currentUser);
        return queryService.cancel(currentUser.getId(), bookingCode,
                request == null ? null : request.reason());
    }

    private static void requireUser(AuthUserDetails currentUser) {
        if (currentUser == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                    "Vui lòng đăng nhập để xem đặt phòng.");
        }
    }
}
