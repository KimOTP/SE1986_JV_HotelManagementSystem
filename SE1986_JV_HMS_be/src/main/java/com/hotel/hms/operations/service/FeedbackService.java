package com.hotel.hms.operations.service;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.repository.FeedbackRepository;
import com.hotel.hms.operations.repository.FeedbackRepository.*;
import com.hotel.hms.operations.security.OperationsIdentity;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
@Transactional(readOnly = true)
public class FeedbackService {
    private final FeedbackRepository persistence;
    private final OperationsIdentity identity;
    private final IssueAssignmentService managerContext;

    public FeedbackService(
            FeedbackRepository persistence,
            OperationsIdentity identity,
            IssueAssignmentService managerContext) {
        this.persistence = persistence;
        this.identity = identity;
        this.managerContext = managerContext;
    }

    private Customer currentCustomer() {
        String email = identity.email();
        var users = persistence.findCustomers(email);
        return users.isEmpty() ? null : users.getFirst();
    }

    private Customer requireCustomer() {
        var customer = currentCustomer();
        if (customer == null)
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Tài khoản hiện tại cần vai trò CUSTOMER đang hoạt động.");
        return customer;
    }

    public FeedbackContext getContext() {
        var customer = currentCustomer();
        return customer == null
                ? new FeedbackContext(
                        false, null, "Tài khoản hiện tại không có vai trò CUSTOMER đang hoạt động.")
                : new FeedbackContext(true, customer.name(), "Khách hàng đang đăng nhập.");
    }

    public List<FeedbackBookingResponse> eligibleBookings() {
        // Only the current customer's checked-out stays without feedback can be selected.
        var customer = requireCustomer();
        var items = persistence.findEligibleBookings(customer.id());
        var rooms =
                persistence.roomsByBooking(
                        items.stream().map(FeedbackBookingResponse::id).toList());
        return items.stream()
                .map(item -> item.withRooms(rooms.getOrDefault(item.id(), List.of())))
                .toList();
    }

    private List<FeedbackResponse> withRooms(List<FeedbackResponse> items) {
        var rooms =
                persistence.roomsByBooking(
                        items.stream().map(FeedbackResponse::bookingId).distinct().toList());
        return items.stream()
                .map(item -> item.withRooms(rooms.getOrDefault(item.bookingId(), List.of())))
                .toList();
    }

    public List<FeedbackResponse> myFeedback(int page, int size) {
        return myFeedback(page, size, "");
    }

    public List<FeedbackResponse> myFeedback(int page, int size, String bookingCode) {
        var customer = requireCustomer();
        return withRooms(persistence.findMine(customer.id(), page, size, bookingCode));
    }

    public List<FeedbackResponse> managedFeedback(int page, int size, int rating, String status) {
        var manager = managerContext.requireManager();
        return withRooms(
                persistence.findManaged(
                        manager.admin() ? 1 : 0, manager.id(), page, size, rating, status));
    }

    @Transactional
    public Long create(CreateFeedbackRequest request) {
        // Recheck ownership and checkout status even when the UI already filtered the list.
        var customer = requireCustomer();
        var bookings = persistence.findBooking(request.bookingId());
        if (bookings.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found");
        var booking = bookings.getFirst();
        if (!customer.id().equals(booking.customerId()))
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Booking belongs to another customer");
        if (!"CHECKED_OUT".equals(booking.status()))
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Feedback requires a checked-out booking");
        try {
            return persistence.insert(request, customer.id(), booking.id());
        } catch (DuplicateKeyException exception) {
            // The database also rejects duplicate feedback from simultaneous submissions.
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "This booking already has feedback");
        }
    }

    @Transactional
    public void reply(Long id, ReplyFeedbackRequest request) {
        var manager = managerContext.requireManager();
        var feedback = persistence.findFeedback(id);
        if (feedback.isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found");
        managerContext.assertScope(manager, feedback.getFirst().hotelId());
        if (feedback.getFirst().reply() != null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Feedback already replied");
        int changed = persistence.reply(id, request.reply(), manager.id());
        if (changed != 1)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Feedback changed concurrently");
    }
}
