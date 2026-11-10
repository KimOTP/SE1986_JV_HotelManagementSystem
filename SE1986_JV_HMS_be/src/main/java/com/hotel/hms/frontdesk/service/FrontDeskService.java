package com.hotel.hms.frontdesk.service;

import com.hotel.hms.frontdesk.dto.CheckInRequest;
import com.hotel.hms.frontdesk.dto.ReservationResponse;
import com.hotel.hms.frontdesk.entity.*;
import com.hotel.hms.frontdesk.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

@Service
public class FrontDeskService {
    @Autowired private BookingRepository bookingRepository;
    @Autowired private BookingRoomRepository bookingRoomRepository;
    @Autowired private HotelRoomRepository roomRepository;
    @Autowired private GuestRegistrationRepository guestRegistrationRepository;
    @Autowired private BookingStatusHistoryRepository historyRepository;
    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private InvoiceItemRepository invoiceItemRepository;
    @Autowired private PaymentService paymentService;
    @Autowired private ActorService actorService;
    @Value("${frontdesk.hotel-zone:Asia/Ho_Chi_Minh}") private String hotelZone;

    public BookingStay requireBooking(String code, boolean lock, ActorService.Actor actor) {
        BookingStay booking = (lock ? bookingRepository.findLockedByCode(code)
                : bookingRepository.findByCode(code))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy booking: " + code));
        actorService.requireHotel(actor, booking.getHotelId());
        return booking;
    }

    public List<RoomStay> rooms(Long bookingId) {
        return bookingRoomRepository.findByBooking_IdOrderByIdAsc(bookingId);
    }

    private LocalDate today() { return LocalDate.now(ZoneId.of(hotelZone)); }
    private LocalDateTime now() { return LocalDateTime.now(ZoneOffset.UTC); }

    public ReservationResponse toResponse(BookingStay booking) {
        List<RoomStay> rooms = rooms(booking.getId());
        RoomStay first = rooms.isEmpty() ? null : rooms.get(0);
        List<ReservationResponse.RoomResponse> roomDtos = rooms.stream().map(r ->
                ReservationResponse.RoomResponse.builder()
                        .bookingRoomId(r.getId()).roomNumber(r.getRoom().getRoomNumber())
                        .roomType(r.getRoom().getRoomType().getName())
                        .nightlyRate(r.getNightlyRate())
                        .operationalStatus(r.getRoom().getOperationalStatus())
                        .housekeepingStatus(r.getRoom().getHousekeepingStatus()).build()).toList();
        return ReservationResponse.builder()
                .id(booking.getCode()).bookingId(booking.getId()).guestName(booking.getGuestName())
                .phone(booking.getPhone())
                .roomNumber(first == null ? null : first.getRoom().getRoomNumber())
                .roomType(first == null ? null : first.getRoom().getRoomType().getName())
                .checkIn(booking.getCheckIn()).checkOut(booking.getCheckOut())
                .guests(booking.getGuests()).depositRequired(booking.getDepositRequired())
                .depositPaid(paymentService.depositPaid(booking.getId()))
                .pricePerNight(first == null ? null : first.getNightlyRate())
                .status(booking.getStatus())
                .actualCheckIn(first == null ? null : first.getActualCheckIn())
                .actualCheckOut(first == null ? null : first.getActualCheckOut())
                .rooms(roomDtos).build();
    }

    @Transactional(readOnly = true)
    public List<ReservationResponse> list(ActorService.Actor actor, boolean checkin,
                                          boolean onlyToday, String keyword) {
        String status = checkin ? "CONFIRMED" : "CHECKED_IN";
        String k = keyword == null ? "" : keyword.trim().toLowerCase(Locale.ROOT);
        return bookingRepository.findByStatusOrderByCheckInAscIdAsc(status).stream()
                .filter(b -> actor.isAdmin() || Objects.equals(actor.getHotelId(), b.getHotelId()))
                .filter(b -> !checkin || !onlyToday || today().equals(b.getCheckIn()))
                .map(this::toResponse)
                .filter(b -> k.isEmpty() || String.join(" ", b.getId(), b.getGuestName(), b.getPhone(),
                        Objects.toString(b.getRoomNumber(), "")).toLowerCase(Locale.ROOT).contains(k))
                .toList();
    }

    @Transactional(readOnly = true)
    public ReservationResponse detail(String code, ActorService.Actor actor) {
        return toResponse(requireBooking(code, false, actor));
    }

    private CheckInRequest.RoomGuest validateGuest(RoomStay room, String fullName,
                                                   String doc, String type) {
        String name = fullName == null ? "" : fullName.trim();
        if (name.isBlank() || name.length() > 150) throw ApiException.bad("Tên khách không hợp lệ.");
        String document = doc == null ? "" : doc.trim();
        String documentType = type == null || type.isBlank() ? "CCCD" : type.trim();
        if (!List.of("CCCD", "PASSPORT", "OTHER").contains(documentType)
                || document.length() < 3 || document.length() > 50) {
            throw ApiException.bad("Giấy tờ tùy thân không hợp lệ.");
        }
        if ("CCCD".equals(documentType) && !document.matches("\\d{9,12}")) {
            throw ApiException.bad("CCCD/CMND cần 9–12 chữ số.");
        }
        return new CheckInRequest.RoomGuest(room.getId(), room.getRoom().getRoomNumber(),
                name, document, documentType);
    }

    @Transactional
    public ReservationResponse checkIn(String code, CheckInRequest request, ActorService.Actor actor) {
        BookingStay booking = requireBooking(code, true, actor);
        if (!"CONFIRMED".equals(booking.getStatus())) throw ApiException.conflict("Booking chưa CONFIRMED.");
        if (today().isBefore(booking.getCheckIn()) || !today().isBefore(booking.getCheckOut())) {
            throw ApiException.conflict("Ngày hiện tại nằm ngoài thời gian lưu trú của booking.");
        }
        if (paymentService.depositPaid(booking.getId()).compareTo(booking.getDepositRequired()) < 0) {
            throw ApiException.conflict("Khách chưa thanh toán đủ tiền cọc.");
        }
        List<RoomStay> roomStays = bookingRoomRepository.findLockedByBooking_IdOrderByIdAsc(booking.getId());
        if (roomStays.isEmpty()) throw ApiException.conflict("Booking chưa gán phòng vật lý.");
        if (request == null) throw ApiException.bad("Thiếu thông tin xác minh khách.");
        Map<Long, CheckInRequest.RoomGuest> guests = new HashMap<>();
        if (request.getRoomGuests() != null && !request.getRoomGuests().isEmpty()) {
            if (request.getRoomGuests().size() != roomStays.size()) {
                throw ApiException.bad("Booking nhiều phòng phải khai báo khách chính cho từng phòng.");
            }
            for (CheckInRequest.RoomGuest g : request.getRoomGuests()) {
                if (g == null || g.getBookingRoomId() == null) throw ApiException.bad("Thiếu bookingRoomId.");
                RoomStay stay = roomStays.stream().filter(r -> r.getId().equals(g.getBookingRoomId()))
                        .findFirst().orElseThrow(() -> ApiException.bad("bookingRoomId không thuộc booking."));
                if (g.getRoomNumber() == null || !g.getRoomNumber().trim().equalsIgnoreCase(stay.getRoom().getRoomNumber())) {
                    throw ApiException.bad("Số phòng không trùng phòng đã đặt.");
                }
                String fullName = g.getFullName() == null || g.getFullName().isBlank()
                        ? booking.getGuestName() : g.getFullName();
                if (guests.put(stay.getId(), validateGuest(stay, fullName,
                        g.getIdNumber(), g.getDocumentType())) != null) {
                    throw ApiException.bad("Phòng bị khai báo hai lần.");
                }
            }
        } else {
            if (roomStays.size() != 1) throw ApiException.bad("Booking nhiều phòng cần roomGuests.");
            RoomStay stay = roomStays.get(0);
            if (request.getRoomNumber() == null ||
                    !request.getRoomNumber().trim().equalsIgnoreCase(stay.getRoom().getRoomNumber())) {
                throw ApiException.bad("Phòng phải trùng với booking.");
            }
            guests.put(stay.getId(), validateGuest(stay, booking.getGuestName(),
                    request.getIdNumber(), request.getDocumentType()));
        }
        String note = request.getNote() == null ? null : request.getNote().trim();
        if (note != null && note.length() > 1000) throw ApiException.bad("Ghi chú tối đa 1000 ký tự.");
        // Lock each physical room in deterministic order to prevent check-in races.
        List<Long> roomIds = roomStays.stream().map(r -> r.getRoom().getId()).sorted().toList();
        Map<Long, HotelRoom> lockedRooms = new HashMap<>();
        for (Long roomId : roomIds) {
            lockedRooms.put(roomId, roomRepository.findLockedById(roomId)
                    .orElseThrow(() -> ApiException.notFound("Phòng không tồn tại.")));
        }
        for (RoomStay stay : roomStays) {
            HotelRoom room = lockedRooms.get(stay.getRoom().getId());
            if (!Boolean.TRUE.equals(room.getActive()) || !"AVAILABLE".equals(room.getOperationalStatus())
                    || !"CLEAN".equals(room.getHousekeepingStatus()) || stay.getActualCheckIn() != null
                    || bookingRoomRepository.countByRoom_IdAndBooking_IdNotAndBooking_Status(room.getId(), booking.getId(), "CHECKED_IN") > 0) {
                throw ApiException.conflict("Phòng " + room.getRoomNumber() + " chưa sẵn sàng hoặc đã có khách.");
            }
        }
        LocalDateTime at = now();
        for (RoomStay stay : roomStays) {
            HotelRoom room = lockedRooms.get(stay.getRoom().getId());
            stay.setActualCheckIn(at);
            room.setOperationalStatus("OCCUPIED");
            roomRepository.save(room);
            bookingRoomRepository.save(stay);
            CheckInRequest.RoomGuest guest = guests.get(stay.getId());
            GuestRegistration registration = new GuestRegistration();
            registration.setBookingRoom(stay);
            registration.setFullName(guest.getFullName());
            registration.setDocumentType(guest.getDocumentType());
            registration.setDocumentNumber(guest.getIdNumber());
            registration.setPrimary(true);
            guestRegistrationRepository.save(registration);
        }
        booking.setStatus("CHECKED_IN");
        bookingRepository.save(booking);
        saveHistory(booking, "CONFIRMED", "CHECKED_IN", actor.getId(), note);
        return toResponse(booking);
    }

    private void saveHistory(BookingStay booking, String oldStatus,
                             String newStatus, Long actorId, String note) {
        BookingStatusHistory history = new BookingStatusHistory();
        history.setBooking(booking);
        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);
        history.setChangedBy(actorId);
        history.setNote(note);
        historyRepository.save(history);
    }

    // Caller must already hold booking lock in a single transaction.
    public void checkoutLocked(BookingStay booking, ActorService.Actor actor) {
        actorService.requireHotel(actor, booking.getHotelId());
        if (!"CHECKED_IN".equals(booking.getStatus())) {
            throw ApiException.conflict("Booking không ở trạng thái CHECKED_IN.");
        }
        InvoiceRecord invoice = invoiceRepository.findLockedByBooking_Id(booking.getId())
                .orElseThrow(() -> ApiException.conflict("Chưa có hóa đơn."));
        if (Boolean.TRUE.equals(invoice.getDeleted()) || !"PAID".equals(invoice.getStatus())) {
            throw ApiException.conflict("Hóa đơn chưa thanh toán.");
        }
        BigDecimal subtotal = invoiceItemRepository.findByInvoice_IdOrderByIdAsc(invoice.getId())
                .stream().map(InvoiceLine::total).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal total = subtotal.subtract(invoice.getDiscount()).add(invoice.getTax());
        BigDecimal paid = paymentService.depositPaid(booking.getId())
                .add(paymentService.paidForInvoice(invoice.getId()));
        if (paid.compareTo(total) != 0) throw ApiException.conflict("Tổng tiền thu không khớp hóa đơn.");
        List<RoomStay> stays = bookingRoomRepository.findLockedByBooking_IdOrderByIdAsc(booking.getId());
        if (stays.isEmpty() || stays.stream().anyMatch(s -> s.getActualCheckIn() == null || s.getActualCheckOut() != null)) {
            throw ApiException.conflict("Thông tin phòng check-in/check-out không hợp lệ.");
        }
        LocalDateTime at = now();
        List<Long> roomIds = stays.stream().map(s -> s.getRoom().getId()).sorted().toList();
        Map<Long, HotelRoom> lockedRooms = new HashMap<>();
        for (Long id : roomIds) lockedRooms.put(id,
                roomRepository.findLockedById(id).orElseThrow(() -> ApiException.notFound("Phòng không tồn tại.")));
        for (RoomStay stay : stays) {
            stay.setActualCheckOut(at);
            bookingRoomRepository.save(stay);
            HotelRoom room = lockedRooms.get(stay.getRoom().getId());
            room.setOperationalStatus("AVAILABLE");
            room.setHousekeepingStatus("DIRTY");
            roomRepository.save(room);
        }
        booking.setStatus("CHECKED_OUT");
        bookingRepository.save(booking);
        saveHistory(booking, "CHECKED_IN", "CHECKED_OUT", actor.getId(),
                "Trả phòng sau khi quyết toán hóa đơn");
    }

    @Transactional
    public ReservationResponse checkOut(String code, ActorService.Actor actor) {
        BookingStay booking = requireBooking(code, true, actor);
        checkoutLocked(booking, actor);
        return toResponse(booking);
    }
}
