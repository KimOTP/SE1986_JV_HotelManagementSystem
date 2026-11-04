package com.hotel.hms.bookings.service;

import com.hotel.hms.bookings.dto.BookingResponse;
import com.hotel.hms.bookings.dto.CreateBookingRequest;
import com.hotel.hms.bookings.repository.BookingCreationRepository;
import com.hotel.hms.bookings.repository.BookingCreationRepository.AvailableRoom;
import com.hotel.hms.bookings.repository.BookingCreationRepository.NewBooking;
import com.hotel.hms.bookings.repository.BookingCreationRepository.RoomTypeSnapshot;
import com.hotel.hms.common.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.NOT_FOUND;

/**
 * Booking creation rules (UC-C1).
 *
 * <p>The frontend sends the customer's contact details and the selected room
 * type, but never a price or a hotel id. The hotel is derived from the room
 * type and the total is calculated from the database base price inside the
 * same transaction that allocates physical rooms.</p>
 */
@Service
public class BookingService {

    private static final BigDecimal DEPOSIT_RATE = new BigDecimal("0.30");
    private static final int MAX_ROOMS_PER_BOOKING = 10;

    private final BookingCreationRepository repository;
    private final long holdMinutes;
    private final ZoneId hotelZone;

    public BookingService(BookingCreationRepository repository,
                          @Value("${booking.hold-minutes:30}") long holdMinutes,
                          @Value("${frontdesk.hotel-zone:Asia/Ho_Chi_Minh}") String hotelZone) {
        this.repository = repository;
        this.holdMinutes = holdMinutes;
        this.hotelZone = ZoneId.of(hotelZone);
    }

    @Transactional
    public BookingResponse create(long customerId, CreateBookingRequest request) {
        if (request == null) {
            throw new ApiException(BAD_REQUEST, "BOOKING_REQUEST_REQUIRED",
                    "Thiếu thông tin đặt phòng.");
        }

        int guests = request.guests();
        int roomCount = request.rooms();
        if (roomCount < 1 || roomCount > MAX_ROOMS_PER_BOOKING) {
            throw new ApiException(BAD_REQUEST, "BOOKING_INVALID_ROOM_COUNT",
                    "Số phòng phải từ 1 đến " + MAX_ROOMS_PER_BOOKING + ".");
        }
        if (guests < 1) {
            throw new ApiException(BAD_REQUEST, "BOOKING_INVALID_GUEST_COUNT",
                    "Số khách phải từ 1 trở lên.");
        }

        validateDates(request.checkIn(), request.checkOut(), LocalDate.now(hotelZone));

        // The lock is held until this transaction commits. A second request for
        // the same room type waits here and then sees the rooms we just inserted.
        RoomTypeSnapshot roomType = repository.lockRoomType(request.roomTypeId())
                .orElseThrow(() -> new ApiException(NOT_FOUND, "BOOKING_ROOM_TYPE_NOT_FOUND",
                        "Không tìm thấy loại phòng."));
        if (!roomType.active() || !roomType.hotelActive()) {
            throw new ApiException(CONFLICT, "BOOKING_ROOM_TYPE_UNAVAILABLE",
                    "Loại phòng hoặc khách sạn đã ngừng hoạt động.");
        }
        if (guests > roomType.maxGuests() * roomCount) {
            throw new ApiException(BAD_REQUEST, "BOOKING_GUEST_CAPACITY",
                    "Loại phòng này chỉ phục vụ tối đa " + roomType.maxGuests()
                            + " khách/phòng (" + (roomType.maxGuests() * roomCount)
                            + " khách cho " + roomCount + " phòng).");
        }

        int guestsPerRoom = (guests + roomCount - 1) / roomCount;
        List<AvailableRoom> availableRooms = repository.findAvailableRooms(
                roomType.hotelId(), roomType.id(), request.checkIn(), request.checkOut(), guestsPerRoom);
        if (availableRooms.size() < roomCount) {
            throw new ApiException(CONFLICT, "BOOKING_ROOM_NOT_AVAILABLE",
                    availableRooms.isEmpty()
                            ? "Loại phòng đã hết trong khoảng ngày đã chọn."
                            : "Chỉ còn " + availableRooms.size()
                                    + " phòng phù hợp trong khoảng ngày đã chọn.");
        }

        List<AvailableRoom> assignedRooms = new ArrayList<>(availableRooms.subList(0, roomCount));
        long nights = ChronoUnit.DAYS.between(request.checkIn(), request.checkOut());
        BigDecimal pricePerNight = roomType.basePrice().setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = pricePerNight
                .multiply(BigDecimal.valueOf(nights))
                .multiply(BigDecimal.valueOf(roomCount))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal depositRequired = totalAmount
                .multiply(DEPOSIT_RATE)
                .setScale(2, RoundingMode.HALF_UP);

        LocalDateTime createdAt = LocalDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MILLIS);
        LocalDateTime holdExpiresAt = createdAt.plusMinutes(Math.max(1, holdMinutes));
        String bookingCode = newBookingCode();

        long bookingId = repository.insertBooking(new NewBooking(
                bookingCode,
                customerId,
                roomType.hotelId(),
                request.checkIn(),
                request.checkOut(),
                guests,
                request.customerName(),
                request.email(),
                request.phone(),
                request.specialRequests(),
                depositRequired,
                holdExpiresAt,
                createdAt
        ));
        repository.insertBookingRooms(bookingId,
                assignedRooms.stream().map(AvailableRoom::roomId).toList(), pricePerNight);
        repository.insertStatusHistory(bookingId, customerId,
                "Tạo booking trực tuyến cho " + request.customerName());

        return new BookingResponse(
                bookingId,
                bookingCode,
                bookingCode,
                customerId,
                roomType.hotelId(),
                roomType.id(),
                roomType.name(),
                request.checkIn(),
                request.checkOut(),
                nights,
                guests,
                roomCount,
                pricePerNight,
                totalAmount,
                depositRequired,
                BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY),
                "PENDING",
                holdExpiresAt,
                createdAt,
                request.customerName(),
                request.email(),
                request.phone(),
                request.specialRequests(),
                assignedRooms.stream()
                        .map(room -> new BookingResponse.AssignedRoom(room.roomId(), room.roomNumber()))
                        .toList()
        );
    }

    static void validateDates(LocalDate checkIn, LocalDate checkOut, LocalDate today) {
        if (checkIn == null || checkOut == null) {
            throw new ApiException(BAD_REQUEST, "BOOKING_DATES_REQUIRED",
                    "Vui lòng chọn ngày nhận và ngày trả phòng.");
        }
        if (checkIn.isBefore(today)) {
            throw new ApiException(BAD_REQUEST, "BOOKING_CHECK_IN_PAST",
                    "Ngày nhận phòng không được ở quá khứ.");
        }
        if (!checkOut.isAfter(checkIn)) {
            throw new ApiException(BAD_REQUEST, "BOOKING_INVALID_DATE_RANGE",
                    "Ngày trả phòng phải sau ngày nhận phòng.");
        }
    }

    private static String newBookingCode() {
        return "BK-" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 24).toUpperCase(Locale.ROOT);
    }
}
