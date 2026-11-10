package com.hotel.hms.frontdesk.service;


import com.hotel.hms.frontdesk.dto.*;
import com.hotel.hms.frontdesk.entity.*;
import com.hotel.hms.frontdesk.repository.*;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.temporal.ChronoUnit;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class InvoiceService {
    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);

    @Autowired private InvoiceRepository invoiceRepository;
    @Autowired private InvoiceItemRepository itemRepository;
    @Autowired private ServiceChargeRepository serviceRepository;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private BookingRoomRepository bookingRoomRepository;
    @Autowired private PaymentService paymentService;
    @Autowired private ActorService actorService;
    @Autowired private FrontDeskService frontDeskService;
    @Autowired private EntityManager entityManager;

    private static class Totals {
        final BigDecimal subtotal, discount, tax, total;
        Totals(BigDecimal subtotal, BigDecimal discount, BigDecimal tax, BigDecimal total) {
            this.subtotal=subtotal; this.discount=discount; this.tax=tax; this.total=total;
        }
    }

    private InvoiceRecord get(String number, boolean lock) {
        InvoiceRecord invoice = (lock ? invoiceRepository.findLockedByNumber(number)
                : invoiceRepository.findByNumber(number))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy hóa đơn: " + number));
        if (Boolean.TRUE.equals(invoice.getDeleted())) throw ApiException.notFound("Hóa đơn đã xóa mềm.");
        return invoice;
    }

    private BookingStay bookingForActor(InvoiceRecord invoice, ActorService.Actor actor) {
        BookingStay booking = invoice.getBooking();
        actorService.requireHotel(actor, booking.getHotelId());
        return booking;
    }

    @Transactional(readOnly = true)
    public InvoiceDraftResponse draft(String code, ActorService.Actor actor) {
        BookingStay booking = frontDeskService.requireBooking(code, false, actor);
        if (!"CHECKED_IN".equals(booking.getStatus())) {
            throw ApiException.conflict("Chỉ lập hóa đơn cho booking đang lưu trú.");
        }
        List<RoomStay> rooms = frontDeskService.rooms(booking.getId());
        if (rooms.isEmpty()) throw ApiException.conflict("Booking chưa gán phòng vật lý.");
        return InvoiceDraftResponse.builder().bookingId(booking.getCode())
                .guestName(booking.getGuestName())
                .roomNumber(String.join(", ", rooms.stream().map(r -> r.getRoom().getRoomNumber()).toList()))
                .deposit(paymentService.depositPaid(booking.getId()))
                .items(canonicalLines(booking, rooms)).build();
    }

    private List<InvoiceItemInput> canonicalLines(BookingStay booking, List<RoomStay> rooms) {
        long nights = ChronoUnit.DAYS.between(booking.getCheckIn(), booking.getCheckOut());
        List<InvoiceItemInput> lines = new ArrayList<>();
        for (RoomStay room : rooms) {
            lines.add(InvoiceItemInput.builder().type("ROOM").bookingRoomId(room.getId())
                    .description("Tiền phòng " + room.getRoom().getRoomNumber() + " (" + nights + " đêm)")
                    .quantity(BigDecimal.valueOf(nights)).unitPrice(room.getNightlyRate()).build());
        }
        for (ServiceCharge service : serviceRepository.findByBookingRoom_Booking_IdAndStatusOrderByIdAsc(booking.getId(), "DELIVERED")) {
            lines.add(InvoiceItemInput.builder().type("SERVICE").serviceOrderId(service.getId())
                    .description(service.getService().getName())
                    .quantity(service.getQuantity()).unitPrice(service.getUnitPrice()).build());
        }
        return lines;
    }

    private String key(InvoiceItemInput item) {
        return item.getType() + ":" + ("ROOM".equals(item.getType())
                ? item.getBookingRoomId() : item.getServiceOrderId());
    }

    private List<InvoiceItemInput> validateLines(BookingStay booking, InvoiceSaveRequest request) {
        if (request == null || request.getItems() == null || request.getItems().isEmpty()
                || request.getItems().size() > 200) {
            throw ApiException.bad("Hóa đơn phải có 1–200 dòng hợp lệ.");
        }
        Map<String, InvoiceItemInput> required = new HashMap<>();
        for (InvoiceItemInput item : canonicalLines(booking, frontDeskService.rooms(booking.getId()))) {
            required.put(key(item), item);
        }
        Set<String> seen = new HashSet<>();
        List<InvoiceItemInput> result = new ArrayList<>();
        for (InvoiceItemInput item : request.getItems()) {
            if (item == null || !List.of("ROOM", "SERVICE", "OTHER").contains(item.getType())) {
                throw ApiException.bad("Loại dòng hóa đơn không hợp lệ.");
            }
            if (item.getDescription() == null || item.getDescription().isBlank()
                    || item.getDescription().trim().length() > 500) {
                throw ApiException.bad("Mô tả dòng hóa đơn phải có 1–500 ký tự.");
            }
            BigDecimal qty = item.getQuantity(), unit = item.getUnitPrice();
            if (qty == null || unit == null || qty.signum() <= 0 || unit.signum() < 0
                    || qty.scale() > 2 || unit.scale() > 2
                    || qty.compareTo(new BigDecimal("99999999.99")) > 0
                    || unit.compareTo(new BigDecimal("9999999999999999.99")) > 0) {
                throw ApiException.bad("Số lượng hoặc đơn giá không hợp lệ.");
            }
            if ("OTHER".equals(item.getType())) {
                if (item.getBookingRoomId() != null || item.getServiceOrderId() != null) {
                    throw ApiException.bad("Dòng OTHER không được tham chiếu phòng/dịch vụ.");
                }
                result.add(InvoiceItemInput.builder().type("OTHER").description(item.getDescription().trim())
                        .quantity(qty).unitPrice(unit).build());
                continue;
            }
            if ("ROOM".equals(item.getType()) && (item.getBookingRoomId() == null || item.getServiceOrderId() != null)
                    || "SERVICE".equals(item.getType()) && (item.getServiceOrderId() == null || item.getBookingRoomId() != null)) {
                throw ApiException.bad("Dòng ROOM/SERVICE phải chứa đúng khóa ngoại tương ứng.");
            }
            String key = key(item);
            InvoiceItemInput canonical = required.get(key);
            if (canonical == null || !seen.add(key)) {
                throw ApiException.bad("Dòng ROOM/SERVICE không thuộc booking, chưa giao hoặc trùng.");
            }
            if (qty.compareTo(canonical.getQuantity()) != 0 || unit.compareTo(canonical.getUnitPrice()) != 0) {
                throw ApiException.bad("Giá và số lượng ROOM/SERVICE phải lấy từ dữ liệu gốc.");
            }
            result.add(canonical);
        }
        if (!seen.containsAll(required.keySet())) throw ApiException.bad("Thiếu dòng ROOM/SERVICE bắt buộc.");
        return result;
    }

    private Totals totals(List<InvoiceItemInput> lines, InvoiceSaveRequest request) {
        BigDecimal subtotal = lines.stream()
                .map(i -> i.getQuantity().multiply(i.getUnitPrice()))
                .reduce(ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
        BigDecimal discount = request.getDiscount() == null ? ZERO : request.getDiscount();
        BigDecimal taxRate = request.getTaxRate() == null ? ZERO : request.getTaxRate();
        if (discount.scale() > 2 || discount.signum() < 0 || discount.compareTo(subtotal) > 0) {
            throw ApiException.bad("Giảm giá phải nằm trong khoảng 0 đến tạm tính.");
        }
        if (taxRate.scale() > 2 || taxRate.signum() < 0 || taxRate.compareTo(HUNDRED) > 0) {
            throw ApiException.bad("VAT phải từ 0–100%.");
        }
        BigDecimal taxable = subtotal.subtract(discount);
        BigDecimal tax = taxable.multiply(taxRate).divide(HUNDRED, 2, RoundingMode.HALF_UP);
        return new Totals(subtotal, discount, tax, taxable.add(tax));
    }

    private String note(InvoiceSaveRequest req) {
        String note = req.getNote() == null ? null : req.getNote().trim();
        if (note != null && note.length() > 1000) throw ApiException.bad("Ghi chú tối đa 1000 ký tự.");
        return note;
    }

    private void ensureVersion(InvoiceRecord invoice, String expected) {
        if (expected != null && !expected.isBlank() &&
                !Base64.getEncoder().encodeToString(invoice.getRowVersion()).equals(expected)) {
            throw ApiException.conflict("Hóa đơn đã thay đổi. Hãy tải lại trước khi lưu.");
        }
    }

    private void replaceLines(InvoiceRecord invoice, List<InvoiceItemInput> inputs) {
        itemRepository.deleteByInvoice_Id(invoice.getId());
        itemRepository.flush();
        List<RoomStay> rooms = bookingRoomRepository.findByBooking_IdOrderByIdAsc(invoice.getBooking().getId());
        Map<Long, RoomStay> byRoom = new HashMap<>();
        for (RoomStay room : rooms) byRoom.put(room.getId(), room);
        Map<Long, ServiceCharge> byService = new HashMap<>();
        for (ServiceCharge charge : serviceRepository.findByBookingRoom_Booking_IdAndStatusOrderByIdAsc(invoice.getBooking().getId(), "DELIVERED")) {
            byService.put(charge.getId(), charge);
        }
        List<InvoiceLine> rows = new ArrayList<>();
        for (InvoiceItemInput input : inputs) {
            InvoiceLine row = new InvoiceLine();
            row.setInvoice(invoice);
            row.setType(input.getType());
            row.setDescription(input.getDescription());
            row.setQuantity(input.getQuantity());
            row.setUnitPrice(input.getUnitPrice());
            if ("ROOM".equals(input.getType())) row.setBookingRoom(byRoom.get(input.getBookingRoomId()));
            if ("SERVICE".equals(input.getType())) row.setServiceOrder(byService.get(input.getServiceOrderId()));
            rows.add(row);
        }
        itemRepository.saveAllAndFlush(rows);
    }

    @Transactional
    public InvoiceResponse create(InvoiceSaveRequest req, ActorService.Actor actor) {
        if (req == null || req.getBookingId() == null || req.getBookingId().isBlank()) {
            throw ApiException.bad("Thiếu bookingId.");
        }
        BookingStay booking = frontDeskService.requireBooking(req.getBookingId().trim(), true, actor);
        if (!"CHECKED_IN".equals(booking.getStatus())) throw ApiException.conflict("Booking chưa CHECKED_IN.");
        if (invoiceRepository.findLockedByBooking_Id(booking.getId()).isPresent()) {
            throw ApiException.conflict("Booking đã có hóa đơn, kể cả hóa đơn xóa mềm. Có UNIQUE(booking_id).");
        }
        List<InvoiceItemInput> inputs = validateLines(booking, req);
        Totals totals = totals(inputs, req);
        InvoiceRecord invoice = new InvoiceRecord();
        invoice.setNumber("INV-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase());
        invoice.setBooking(booking);
        invoice.setStatus("ISSUED");
        invoice.setDiscount(totals.discount);
        invoice.setTax(totals.tax);
        invoice.setNote(note(req));
        invoice.setCreatedBy(actor.getId());
        invoice.setIssuedAt(LocalDateTime.now(ZoneOffset.UTC));
        invoice.setDeleted(false);
        invoiceRepository.saveAndFlush(invoice);
        replaceLines(invoice, inputs);
        entityManager.refresh(invoice); // Read SQL Server ROWVERSION/DB defaults.
        return detailInternal(invoice, actor);
    }

    private InvoiceResponse detailInternal(InvoiceRecord invoice, ActorService.Actor actor) {
        BookingStay booking = bookingForActor(invoice, actor);
        List<InvoiceLine> lines = itemRepository.findByInvoice_IdOrderByIdAsc(invoice.getId());
        BigDecimal subtotal = lines.stream().map(InvoiceLine::total).reduce(ZERO, BigDecimal::add);
        BigDecimal taxable = subtotal.subtract(invoice.getDiscount());
        BigDecimal total = taxable.add(invoice.getTax());
        BigDecimal deposit = paymentService.depositPaid(booking.getId());
        BigDecimal paid = paymentService.paidForInvoice(invoice.getId());
        BigDecimal due = total.subtract(deposit).subtract(paid).max(ZERO);
        BigDecimal percent = taxable.signum() > 0
                ? invoice.getTax().multiply(HUNDRED).divide(taxable, 2, RoundingMode.HALF_UP) : ZERO;
        List<RoomStay> rooms = frontDeskService.rooms(booking.getId());
        List<InvoiceResponse.Item> items = lines.stream().map(line -> InvoiceResponse.Item.builder()
                .id(line.getId()).type(line.getType())
                .bookingRoomId(line.getBookingRoom() == null ? null : line.getBookingRoom().getId())
                .serviceOrderId(line.getServiceOrder() == null ? null : line.getServiceOrder().getId())
                .description(line.getDescription()).quantity(line.getQuantity()).unitPrice(line.getUnitPrice())
                .lineTotal(line.total()).build()).toList();
        return InvoiceResponse.builder()
                .id(invoice.getNumber()).invoiceId(invoice.getId()).bookingId(booking.getCode())
                .guestName(booking.getGuestName())
                .roomNumber(String.join(", ", rooms.stream().map(r -> r.getRoom().getRoomNumber()).toList()))
                .issuedAt(invoice.getIssuedAt()).status(invoice.getStatus())
                .discount(invoice.getDiscount()).taxRate(percent).tax(invoice.getTax())
                .deposit(deposit).subtotal(subtotal).total(total).due(due)
                .paymentMethod(paymentService.lastPaymentMethod(invoice.getId()))
                .note(invoice.getNote())
                .rowVersion(invoice.getRowVersion() == null ? null : Base64.getEncoder().encodeToString(invoice.getRowVersion()))
                .items(items).build();
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getOne(String number, ActorService.Actor actor) {
        return detailInternal(get(number, false), actor);
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> list(ActorService.Actor actor) {
        return invoiceRepository.findTop500ByDeletedFalseOrderByCreatedAtDescIdDesc().stream()
                .filter(i -> actor.isAdmin() || Objects.equals(actor.getHotelId(), i.getBooking().getHotelId()))
                .map(i -> detailInternal(i, actor)).toList();
    }

    @Transactional
    public InvoiceResponse update(String number, InvoiceSaveRequest req, ActorService.Actor actor) {
        InvoiceRecord old = get(number, false);
        BookingStay booking = frontDeskService.requireBooking(old.getBooking().getCode(), true, actor);
        InvoiceRecord invoice = get(number, true);
        if (!"ISSUED".equals(invoice.getStatus()) || !"CHECKED_IN".equals(booking.getStatus())) {
            throw ApiException.conflict("Chỉ sửa hóa đơn ISSUED của khách đang lưu trú.");
        }
        if (paymentService.paidForInvoice(invoice.getId()).signum() != 0) {
            throw ApiException.conflict("Hóa đơn đã có thanh toán, không được sửa.");
        }
        if (req == null || !booking.getCode().equals(req.getBookingId())) {
            throw ApiException.bad("Không thể sửa bookingId của hóa đơn.");
        }
        ensureVersion(invoice, req.getRowVersion());
        List<InvoiceItemInput> inputs = validateLines(booking, req);
        Totals totals = totals(inputs, req);
        replaceLines(invoice, inputs);
        invoice.setDiscount(totals.discount);
        invoice.setTax(totals.tax);
        invoice.setNote(note(req));
        invoiceRepository.saveAndFlush(invoice);
        entityManager.refresh(invoice);
        return detailInternal(invoice, actor);
    }

    @Transactional
    public void delete(String number, ActorService.Actor actor) {
        InvoiceRecord old = get(number, false);
        BookingStay booking = frontDeskService.requireBooking(old.getBooking().getCode(), true, actor);
        InvoiceRecord invoice = get(number, true);
        if (!"ISSUED".equals(invoice.getStatus()) || !"CHECKED_IN".equals(booking.getStatus())
                || paymentService.paidForInvoice(invoice.getId()).signum() != 0) {
            throw ApiException.conflict("Không thể xóa hóa đơn đã thanh toán hoặc booking kết thúc.");
        }
        invoice.setStatus("VOID");
        invoice.setDeleted(true);
        invoice.setDeletedAt(LocalDateTime.now(ZoneOffset.UTC));
        invoice.setDeletedBy(actor.getId());
        invoiceRepository.save(invoice);
    }

    @Transactional
    public InvoiceResponse restore(String number, ActorService.Actor actor) {
        InvoiceRecord old = invoiceRepository.findByNumber(number)
                .orElseThrow(() -> ApiException.notFound("Không có hóa đơn."));
        BookingStay booking = frontDeskService.requireBooking(old.getBooking().getCode(), true, actor);
        InvoiceRecord invoice = invoiceRepository.findLockedByNumber(number)
                .orElseThrow(() -> ApiException.notFound("Không có hóa đơn."));
        if (!Boolean.TRUE.equals(invoice.getDeleted()) || !"VOID".equals(invoice.getStatus())
                || !"CHECKED_IN".equals(booking.getStatus())
                || paymentService.paidForInvoice(invoice.getId()).signum() != 0) {
            throw ApiException.conflict("Chỉ khôi phục hóa đơn VOID chưa thanh toán của khách đang lưu trú.");
        }
        invoice.setStatus("ISSUED");
        invoice.setDeleted(false);
        invoice.setDeletedAt(null);
        invoice.setDeletedBy(null);
        invoiceRepository.saveAndFlush(invoice);
        entityManager.refresh(invoice);
        return detailInternal(invoice, actor);
    }

    private BigDecimal dueOf(InvoiceRecord invoice, BookingStay booking) {
        BigDecimal subtotal = itemRepository.findByInvoice_IdOrderByIdAsc(invoice.getId())
                .stream().map(InvoiceLine::total).reduce(ZERO, BigDecimal::add);
        BigDecimal total = subtotal.subtract(invoice.getDiscount()).add(invoice.getTax());
        BigDecimal paid = paymentService.paidForInvoice(invoice.getId());
        return total.subtract(paymentService.depositPaid(booking.getId())).subtract(paid);
    }

    /** Amount still to be collected through payOS for an ISSUED invoice of a checked-in booking. */
    @Transactional(readOnly = true)
    public BigDecimal payableDue(String number, ActorService.Actor actor) {
        InvoiceRecord invoice = get(number, false);
        BookingStay booking = bookingForActor(invoice, actor);
        if (!"ISSUED".equals(invoice.getStatus()) || !"CHECKED_IN".equals(booking.getStatus())) {
            throw ApiException.conflict("Hóa đơn chưa ISSUED hoặc booking chưa CHECKED_IN.");
        }
        BigDecimal due = dueOf(invoice, booking);
        if (due.signum() < 0) throw ApiException.conflict("Số tiền đã thu lớn hơn tiền hóa đơn; cần đối soát hoàn tiền.");
        return due;
    }

    @Transactional(readOnly = true)
    public Long invoiceId(String number, ActorService.Actor actor) {
        InvoiceRecord invoice = get(number, false);
        bookingForActor(invoice, actor);
        return invoice.getId();
    }

    /** Manual settlement is only possible when the deposit already covers the whole invoice. */
    @Transactional
    public InvoiceResponse pay(String number, ActorService.Actor actor) {
        return settle(number, null, null, actor);
    }

    /** Called after payOS confirmed the exact due amount; idempotent per payment link. */
    @Transactional
    public InvoiceResponse confirmPayosPayment(String number, String providerReference, BigDecimal amountPaid,
                                               ActorService.Actor actor) {
        return settle(number, providerReference, amountPaid, actor);
    }

    private InvoiceResponse settle(String number, String providerReference, BigDecimal amountPaid,
                                   ActorService.Actor actor) {
        InvoiceRecord old = get(number, false);
        BookingStay booking = frontDeskService.requireBooking(old.getBooking().getCode(), true, actor);
        InvoiceRecord invoice = get(number, true);
        if ("PAID".equals(invoice.getStatus()) && providerReference != null
                && paymentService.hasProviderReference(invoice.getId(), providerReference)) {
            entityManager.refresh(invoice);
            return detailInternal(invoice, actor);
        }
        if (!"ISSUED".equals(invoice.getStatus()) || !"CHECKED_IN".equals(booking.getStatus())) {
            throw ApiException.conflict("Hóa đơn chưa ISSUED hoặc booking chưa CHECKED_IN.");
        }
        BigDecimal due = dueOf(invoice, booking);
        if (due.signum() < 0) throw ApiException.conflict("Số tiền đã thu lớn hơn tiền hóa đơn; cần đối soát hoàn tiền.");
        if (due.signum() > 0) {
            if (providerReference == null) {
                throw ApiException.conflict("Hóa đơn phải thanh toán chuyển khoản qua payOS (không thu tiền mặt).");
            }
            if (amountPaid == null || amountPaid.compareTo(due) != 0) {
                throw ApiException.conflict("Số tiền payOS đã thu không khớp số còn phải trả của hóa đơn.");
            }
            paymentService.recordPayosPayment(booking, invoice, due, actor.getId(), providerReference);
        }
        invoice.setStatus("PAID");
        invoiceRepository.saveAndFlush(invoice);
        frontDeskService.checkoutLocked(booking, actor);
        entityManager.refresh(invoice);
        return detailInternal(invoice, actor);
    }
}
