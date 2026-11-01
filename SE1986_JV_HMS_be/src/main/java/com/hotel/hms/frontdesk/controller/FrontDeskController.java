package com.hotel.hms.frontdesk.controller;
import com.hotel.hms.frontdesk.dto.CheckInRequest;
import com.hotel.hms.frontdesk.dto.ReservationResponse;
import com.hotel.hms.frontdesk.service.ActorService;
import com.hotel.hms.frontdesk.service.FrontDeskService;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
@RestController
@RequestMapping("/api/frontdesk")
public class FrontDeskController {
    private final FrontDeskService service;
    private final ActorService actors;
    public FrontDeskController(FrontDeskService service,ActorService actors) {
        this.service=service;this.actors=actors;
    }
    @GetMapping("/check-ins")
    public List<ReservationResponse> checkIns(Principal principal,
                                              @RequestParam(defaultValue="true") boolean todayOnly,
                                              @RequestParam(defaultValue="") String keyword) {
        return service.list(actors.require(principal,"UC-D1"),true,todayOnly,keyword);
    }
    @GetMapping("/check-outs")
    public List<ReservationResponse> checkOuts(Principal principal,
                                               @RequestParam(defaultValue="") String keyword) {
        return service.list(actors.require(principal,"UC-D2"),false,false,keyword);
    }
    @GetMapping("/bookings/{bookingCode}")
    public ReservationResponse booking(@PathVariable String bookingCode,Principal principal) {
        return service.detail(bookingCode,actors.require(principal,"UC-D1"));
    }
    @PostMapping("/bookings/{bookingCode}/check-in")
    public ReservationResponse checkIn(@PathVariable String bookingCode,
                                       @Valid @RequestBody CheckInRequest request,Principal principal) {
        return service.checkIn(bookingCode,request,actors.require(principal,"UC-D1"));
    }
    @PostMapping("/bookings/{bookingCode}/check-out")
    public ReservationResponse checkOut(@PathVariable String bookingCode,Principal principal) {
        return service.checkOut(bookingCode,actors.require(principal,"UC-D2"));
    }
}
