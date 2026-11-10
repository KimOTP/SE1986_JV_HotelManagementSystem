package com.hotel.hms.frontdesk.controller;

import com.hotel.hms.frontdesk.dto.*;
import com.hotel.hms.frontdesk.service.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
@RestController
@RequestMapping("/api/frontdesk")
public class InvoiceController {
    private final InvoiceService service;
    private final ActorService actors;
    private final InvoicePayosService payosService;
    public InvoiceController(InvoiceService service,ActorService actors,InvoicePayosService payosService) {
        this.service=service;this.actors=actors;this.payosService=payosService;
    }
    @GetMapping("/bookings/{bookingCode}/invoice-draft")
    public InvoiceDraftResponse draft(@PathVariable String bookingCode,Principal principal) {
        return service.draft(bookingCode,actors.require(principal,"UC-D3"));
    }
    @GetMapping("/invoices")
    public List<InvoiceResponse> list(Principal principal) {
        return service.list(actors.require(principal,"UC-D4"));
    }
    @GetMapping("/invoices/{invoiceNumber}")
    public InvoiceResponse detail(@PathVariable String invoiceNumber,Principal principal) {
        return service.getOne(invoiceNumber,actors.require(principal,"UC-D4"));
    }
    @PostMapping("/invoices")
    @ResponseStatus(HttpStatus.CREATED)
    public InvoiceResponse create(@Valid @RequestBody InvoiceSaveRequest request,Principal principal) {
        return service.create(request,actors.require(principal,"UC-D3"));
    }
    @PutMapping("/invoices/{invoiceNumber}")
    public InvoiceResponse update(@PathVariable String invoiceNumber,@Valid @RequestBody InvoiceSaveRequest request,
                                  Principal principal) {
        return service.update(invoiceNumber,request,actors.require(principal,"UC-D5"));
    }
    @DeleteMapping("/invoices/{invoiceNumber}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String invoiceNumber,Principal principal) {
        service.delete(invoiceNumber,actors.require(principal,"UC-D6"));
    }
    @PostMapping("/invoices/{invoiceNumber}/restore")
    public InvoiceResponse restore(@PathVariable String invoiceNumber,Principal principal) {
        return service.restore(invoiceNumber,actors.require(principal,"UC-D6"));
    }
    // Only settles invoices with nothing left to collect; any amount due must go through payOS.
    @PostMapping("/invoices/{invoiceNumber}/pay")
    public InvoiceResponse pay(@PathVariable String invoiceNumber,Principal principal) {
        return service.pay(invoiceNumber,actors.require(principal,"UC-D2"));
    }
    @PostMapping("/invoices/{invoiceNumber}/pay/payos")
    public InvoicePayosService.Checkout payos(@PathVariable String invoiceNumber,Principal principal) {
        return payosService.createCheckout(invoiceNumber,actors.require(principal,"UC-D2"));
    }
    @GetMapping("/invoices/{invoiceNumber}/pay/payos/verify")
    public InvoicePayosService.Verification verifyPayos(@PathVariable String invoiceNumber,Principal principal) {
        return payosService.verify(invoiceNumber,actors.require(principal,"UC-D2"));
    }
}
