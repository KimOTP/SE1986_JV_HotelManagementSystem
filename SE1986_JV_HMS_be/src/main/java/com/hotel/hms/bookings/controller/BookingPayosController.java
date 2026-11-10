package com.hotel.hms.bookings.controller;

import com.hotel.hms.bookings.service.BookingPayosService;
import com.hotel.hms.identity.security.AuthUserDetails;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/bookings/{bookingCode}/deposit/payos")
@PreAuthorize("hasAuthority('UC-C2')")
public class BookingPayosController {

    private final BookingPayosService payments;

    public BookingPayosController(BookingPayosService payments) {
        this.payments = payments;
    }

    @PostMapping
    public BookingPayosService.Checkout checkout(@AuthenticationPrincipal AuthUserDetails user,
                                                  @PathVariable String bookingCode) {
        return payments.createCheckout(user.getId(), bookingCode);
    }

    @PostMapping("/verify")
    public BookingPayosService.Verification verify(@AuthenticationPrincipal AuthUserDetails user,
                                                    @PathVariable String bookingCode) {
        return payments.verify(user.getId(), bookingCode);
    }
}
