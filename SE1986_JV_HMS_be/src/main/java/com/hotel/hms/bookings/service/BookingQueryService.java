package com.hotel.hms.bookings.service;

import com.hotel.hms.bookings.dto.BookingResponse;
import com.hotel.hms.bookings.repository.BookingQueryRepository;
import com.hotel.hms.bookings.repository.BookingQueryRepository.BookingRoomRow;
import com.hotel.hms.bookings.repository.BookingQueryRepository.BookingRow;
import com.hotel.hms.common.exception.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Read side của Module C: danh sách "Đặt phòng của tôi" (UC-C3), chi tiết
 * (UC-C6) và hủy đặt phòng (UC-C4).
 *
 * <p>Mọi truy vấn đều giới hạn theo {@code customer_id} lấy từ JWT; khách không
 * đọc được booking của người khác và nhận 404 thay vì 403 để không lộ sự tồn
 * tại của mã đặt phòng.</p>
 */
@Service
public class BookingQueryService {

    static final Set<String> ALLOWED_STATUSES = Set.of(
            "PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "EXPIRED");
    static final Set<String> CANCELLABLE_STATUSES = Set.of("PENDING", "CONFIRMED");

    private static final int MAX_PAGE_SIZE = 100;
    private static final int MAX_PAGE_INDEX = 100_000;
    private static final int MAX_CANCEL_REASON_LENGTH = 1000;
    private static final int DEFAULT_ROOMS = 1;

    private final BookingQueryRepository repository;

    public BookingQueryService(BookingQueryRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> listMine(long customerId, String status, int page, int size) {
        validatePaging(page, size);
        String normalizedStatus = normalizeStatus(status);

        int offset = page * size;
        List<BookingRow> rows = repository.findByCustomer(customerId, normalizedStatus, offset, size);
        if (rows.isEmpty()) {
            return List.of();
        }

        Map<Long, List<BookingRoomRow>> roomsByBooking = repository
                .findRooms(rows.stream().map(BookingRow::bookingId).toList())
                .stream()
                .collect(Collectors.groupingBy(BookingRoomRow::bookingId));

        return rows.stream()
                .map(row -> toResponse(row, roomsByBooking.getOrDefault(row.bookingId(), List.of())))
                .toList();
    }

    /**
     * Danh sách cho console quản lý (UC-2.9 / UC-C5): mọi booking, lọc theo
     * trạng thái và từ khóa (mã, tên, email, điện thoại). Trả kèm tổng số bản
     * ghi để FE phân trang.
     */
    @Transactional(readOnly = true)
    public ManagedBookings listForManagement(String status, String keyword, int page, int size) {
        validatePaging(page, size);
        String normalizedStatus = normalizeStatus(status);
        String normalizedKeyword = keyword == null || keyword.isBlank() ? null : keyword.trim();

        int offset = page * size;
        List<BookingRow> rows = repository.findForManagement(normalizedStatus, normalizedKeyword, offset, size);
        long total = repository.countForManagement(normalizedStatus, normalizedKeyword);
        if (rows.isEmpty()) {
            return new ManagedBookings(List.of(), total);
        }

        Map<Long, List<BookingRoomRow>> roomsByBooking = repository
                .findRooms(rows.stream().map(BookingRow::bookingId).toList())
                .stream()
                .collect(Collectors.groupingBy(BookingRoomRow::bookingId));

        List<BookingResponse> items = rows.stream()
                .map(row -> toResponse(row, roomsByBooking.getOrDefault(row.bookingId(), List.of())))
                .toList();
        return new ManagedBookings(items, total);
    }

    public record ManagedBookings(List<BookingResponse> items, long total) {
    }

    @Transactional(readOnly = true)
    public BookingResponse getByCode(long viewerId, String bookingCode, boolean canViewAnyBooking) {        BookingRow booking = requireBooking(bookingCode);
        if (!canViewAnyBooking && booking.customerId() != viewerId) {
            // 404 thay vì 403: không xác nhận mã đặt phòng của người khác có tồn tại.
            throw new ApiException(NOT_FOUND, "BOOKING_NOT_FOUND",
                    "Không tìm thấy đặt phòng này.");
        }
        return withRooms(booking);
    }

    @Transactional
    public BookingResponse cancel(long customerId, String bookingCode, String reason) {
        String normalizedReason = normalizeReason(reason);
        BookingRow booking = requireBooking(bookingCode);

        if (booking.customerId() != customerId) {
            throw new ApiException(NOT_FOUND, "BOOKING_NOT_FOUND",
                    "Không tìm thấy đặt phòng này.");
        }
        if (!CANCELLABLE_STATUSES.contains(booking.status())) {
            throw new ApiException(CONFLICT, "BOOKING_NOT_CANCELLABLE",
                    "Chỉ có thể hủy đặt phòng đang chờ thanh toán hoặc đã xác nhận.");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MILLIS);
        int updated = repository.cancel(booking.bookingId(), normalizedReason, now);
        if (updated == 0) {
            // Một luồng khác (thanh toán, lễ tân) vừa đổi trạng thái trước khi UPDATE chạy.
            throw new ApiException(CONFLICT, "BOOKING_CANCEL_CONFLICT",
                    "Đặt phòng vừa được cập nhật bởi giao dịch khác. Vui lòng tải lại trang.");
        }

        repository.insertCancellationHistory(booking.bookingId(), booking.status(), customerId,
                normalizedReason == null ? "Khách hủy đặt phòng" : "Khách hủy: " + normalizedReason);

        return withRooms(requireBooking(bookingCode));
    }

    private BookingResponse withRooms(BookingRow booking) {
        List<BookingRoomRow> rooms = repository.findRooms(List.of(booking.bookingId()));
        return toResponse(booking, rooms);
    }

    private BookingRow requireBooking(String bookingCode) {
        if (bookingCode == null || bookingCode.isBlank()) {
            throw new ApiException(BAD_REQUEST, "BOOKING_CODE_REQUIRED",
                    "Thiếu mã đặt phòng.");
        }
        return repository.findByCode(bookingCode.trim())
                .orElseThrow(() -> new ApiException(NOT_FOUND, "BOOKING_NOT_FOUND",
                        "Không tìm thấy đặt phòng này."));
    }

    private static void validatePaging(int page, int size) {
        if (page < 0 || page > MAX_PAGE_INDEX) {
            throw new ApiException(BAD_REQUEST, "BOOKING_INVALID_PAGE",
                    "page phải từ 0 đến " + MAX_PAGE_INDEX + ".");
        }
        if (size < 1 || size > MAX_PAGE_SIZE) {
            throw new ApiException(BAD_REQUEST, "BOOKING_INVALID_PAGE_SIZE",
                    "size phải từ 1 đến " + MAX_PAGE_SIZE + ".");
        }
    }

    private static String normalizeStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(normalized)) {
            throw new ApiException(BAD_REQUEST, "BOOKING_INVALID_STATUS",
                    "Trạng thái lọc không hợp lệ. Giá trị cho phép: "
                            + String.join(", ", ALLOWED_STATUSES.stream().sorted().toList()) + ".");
        }
        return normalized;
    }

    private static String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return null;
        }
        String trimmed = reason.trim();
        if (trimmed.length() > MAX_CANCEL_REASON_LENGTH) {
            throw new ApiException(BAD_REQUEST, "BOOKING_CANCEL_REASON_TOO_LONG",
                    "Lý do hủy tối đa " + MAX_CANCEL_REASON_LENGTH + " ký tự.");
        }
        return trimmed;
    }

    /**
     * Dựng lại cùng shape với {@code POST /api/bookings}: tổng tiền tính từ
     * nightly_rate đã lưu, không đọc lại giá hiện tại của loại phòng.
     */
    private static BookingResponse toResponse(BookingRow booking, List<BookingRoomRow> rooms) {
        long nights = ChronoUnit.DAYS.between(booking.checkIn(), booking.checkOut());
        int roomCount = rooms.isEmpty() ? DEFAULT_ROOMS : rooms.size();

        BigDecimal nightlySum = rooms.stream()
                .map(BookingRoomRow::nightlyRate)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal pricePerNight = nightlySum
                .divide(BigDecimal.valueOf(roomCount), 2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = nightlySum
                .multiply(BigDecimal.valueOf(nights))
                .setScale(2, RoundingMode.HALF_UP);

        List<Long> distinctTypeIds = rooms.stream()
                .map(BookingRoomRow::roomTypeId)
                .distinct()
                .toList();
        String roomTypeName = rooms.stream()
                .map(BookingRoomRow::roomTypeName)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .collect(Collectors.joining(", "));

        List<BookingResponse.AssignedRoom> assignedRooms = rooms.stream()
                .map(room -> new BookingResponse.AssignedRoom(room.roomId(), room.roomNumber()))
                .toList();

        return new BookingResponse(
                booking.bookingId(),
                booking.bookingCode(),
                booking.bookingCode(),
                booking.customerId(),
                booking.hotelId(),
                distinctTypeIds.size() == 1 ? distinctTypeIds.get(0) : null,
                roomTypeName.isEmpty() ? null : roomTypeName,
                booking.checkIn(),
                booking.checkOut(),
                nights,
                booking.guests(),
                roomCount,
                pricePerNight,
                totalAmount,
                booking.depositRequired(),
                booking.depositPaid() == null ? BigDecimal.ZERO.setScale(2) : booking.depositPaid(),
                booking.status(),
                booking.holdExpiresAt(),
                booking.createdAt(),
                booking.contactName(),
                booking.email(),
                booking.phone(),
                booking.specialRequests(),
                assignedRooms,
                booking.cancelReason(),
                booking.cancelledAt()
        );
    }
}
