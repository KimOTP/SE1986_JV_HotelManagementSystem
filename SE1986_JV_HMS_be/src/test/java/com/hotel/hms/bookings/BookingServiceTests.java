package com.hotel.hms.bookings;

import com.hotel.hms.bookings.dto.BookingResponse;
import com.hotel.hms.bookings.dto.CreateBookingRequest;
import com.hotel.hms.bookings.repository.BookingCreationRepository;
import com.hotel.hms.bookings.repository.BookingCreationRepository.AvailableRoom;
import com.hotel.hms.bookings.repository.BookingCreationRepository.NewBooking;
import com.hotel.hms.bookings.repository.BookingCreationRepository.RoomTypeSnapshot;
import com.hotel.hms.bookings.service.BookingService;
import com.hotel.hms.common.exception.ApiException;
import jakarta.validation.Validation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BookingServiceTests {

    private static final ZoneId HOTEL_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDate TODAY = LocalDate.now(HOTEL_ZONE);

    private BookingCreationRepository repository;
    private BookingService service;
    private LocalDate checkIn;
    private LocalDate checkOut;

    @BeforeEach
    void setUp() {
        repository = mock(BookingCreationRepository.class);
        service = new BookingService(repository, 15, HOTEL_ZONE.getId());
        checkIn = TODAY.plusDays(10);
        checkOut = checkIn.plusDays(2);
    }

    @Test
    void createsPendingBookingUsingDatabasePriceAndThirtyPercentDeposit() {
        when(repository.lockRoomType(2L)).thenReturn(Optional.of(deluxe()));
        when(repository.findAvailableRooms(1L, 2L, checkIn, checkOut, 2))
                .thenReturn(List.of(room(4L, "201"), room(5L, "202")));
        when(repository.insertBooking(any())).thenReturn(99L);

        BookingResponse response = service.create(5L, request(1, 2, "  Nguyễn An  "));

        assertEquals(99L, response.bookingId());
        assertTrue(response.id().startsWith("BK-"));
        assertEquals(response.id(), response.bookingCode());
        assertEquals(5L, response.customerId());
        assertEquals(1L, response.hotelId());
        assertEquals(2L, response.roomTypeId());
        assertEquals("Deluxe", response.roomTypeName());
        assertEquals(checkIn, response.checkIn());
        assertEquals(checkOut, response.checkOut());
        assertEquals(2, response.nights());
        assertEquals(2, response.guests());
        assertEquals(1, response.rooms());
        assertEquals(new BigDecimal("800000.00"), response.pricePerNight());
        assertEquals(new BigDecimal("1600000.00"), response.totalAmount());
        assertEquals(new BigDecimal("480000.00"), response.depositRequired());
        assertEquals(new BigDecimal("0.00"), response.depositPaid());
        assertEquals("PENDING", response.status());
        assertEquals("Nguyễn An", response.customerName());
        assertEquals(List.of(new BookingResponse.AssignedRoom(4L, "201")), response.assignedRooms());
        assertEquals(15, ChronoUnit.MINUTES.between(response.createdAt(), response.holdExpiresAt()));

        ArgumentCaptor<NewBooking> saved = ArgumentCaptor.forClass(NewBooking.class);
        verify(repository).insertBooking(saved.capture());
        assertEquals(response.id(), saved.getValue().code());
        assertEquals(5L, saved.getValue().customerId());
        assertEquals(1L, saved.getValue().hotelId());
        assertEquals("Nguyễn An", saved.getValue().customerName());
        assertEquals("customer@hotel.demo", saved.getValue().email());
        assertEquals("0900000001", saved.getValue().phone());
        assertEquals("Tầng cao", saved.getValue().specialRequests());
        assertEquals(new BigDecimal("480000.00"), saved.getValue().depositRequired());

        verify(repository).insertBookingRooms(99L, List.of(4L), new BigDecimal("800000.00"));
        verify(repository).insertStatusHistory(99L, 5L, "Tạo booking trực tuyến cho Nguyễn An");
    }

    @Test
    void allocatesMultipleRoomsAndUsesPerRoomCapacityForAvailability() {
        when(repository.lockRoomType(2L)).thenReturn(Optional.of(deluxe()));
        when(repository.findAvailableRooms(1L, 2L, checkIn, checkOut, 2))
                .thenReturn(List.of(room(4L, "201"), room(5L, "202"), room(6L, "203")));
        when(repository.insertBooking(any())).thenReturn(100L);

        BookingResponse response = service.create(5L, request(2, 4, "Nguyễn An"));

        assertEquals(2, response.rooms());
        assertEquals(4, response.guests());
        assertEquals(new BigDecimal("3200000.00"), response.totalAmount());
        assertEquals(new BigDecimal("960000.00"), response.depositRequired());
        assertEquals(2, response.assignedRooms().size());
        assertEquals(List.of(4L, 5L),
                response.assignedRooms().stream().map(BookingResponse.AssignedRoom::roomId).toList());
        verify(repository).findAvailableRooms(1L, 2L, checkIn, checkOut, 2);
        verify(repository).insertBookingRooms(100L, List.of(4L, 5L), new BigDecimal("800000.00"));
    }

    @Test
    void rejectsMissingRoomType() {
        when(repository.lockRoomType(2L)).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class,
                () -> service.create(5L, request(1, 2, "Nguyễn An")));

        assertEquals(HttpStatus.NOT_FOUND, error.getStatus());
        assertEquals("BOOKING_ROOM_TYPE_NOT_FOUND", error.getCode());
        verify(repository, never()).findAvailableRooms(anyLong(), anyLong(),
                any(), any(), anyInt());
    }

    @Test
    void rejectsInactiveRoomTypeOrHotel() {
        when(repository.lockRoomType(2L)).thenReturn(Optional.of(
                new RoomTypeSnapshot(2L, 1L, "Deluxe", new BigDecimal("800000"), 3, false, true)));

        ApiException error = assertThrows(ApiException.class,
                () -> service.create(5L, request(1, 2, "Nguyễn An")));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("BOOKING_ROOM_TYPE_UNAVAILABLE", error.getCode());
    }

    @Test
    void rejectsGuestCountAboveRoomCapacity() {
        when(repository.lockRoomType(2L)).thenReturn(Optional.of(deluxe()));

        ApiException error = assertThrows(ApiException.class,
                () -> service.create(5L, request(1, 4, "Nguyễn An")));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals("BOOKING_GUEST_CAPACITY", error.getCode());
        verify(repository, never()).findAvailableRooms(anyLong(), anyLong(),
                any(), any(), anyInt());
    }

    @Test
    void rejectsWhenNotEnoughPhysicalRoomsRemain() {
        when(repository.lockRoomType(2L)).thenReturn(Optional.of(deluxe()));
        when(repository.findAvailableRooms(1L, 2L, checkIn, checkOut, 2))
                .thenReturn(List.of(room(4L, "201")));

        ApiException error = assertThrows(ApiException.class,
                () -> service.create(5L, request(2, 4, "Nguyễn An")));

        assertEquals(HttpStatus.CONFLICT, error.getStatus());
        assertEquals("BOOKING_ROOM_NOT_AVAILABLE", error.getCode());
        assertTrue(error.getMessage().contains("Chỉ còn 1 phòng"));
        verify(repository, never()).insertBooking(any());
    }

    @Test
    void rejectsCheckOutNotAfterCheckIn() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.create(5L, request(1, 2, "Nguyễn An", checkIn, checkIn)));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals("BOOKING_INVALID_DATE_RANGE", error.getCode());
        verify(repository, never()).lockRoomType(anyLong());
    }

    @Test
    void rejectsCheckInInThePast() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.create(5L, request(1, 2, "Nguyễn An",
                        TODAY.minusDays(1), TODAY.plusDays(1))));

        assertEquals(HttpStatus.BAD_REQUEST, error.getStatus());
        assertEquals("BOOKING_CHECK_IN_PAST", error.getCode());
        verify(repository, never()).lockRoomType(anyLong());
    }

    @Test
    void validatesAndTrimsRequestBody() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var valid = new CreateBookingRequest(2L, checkIn, checkOut, 2, 1,
                    "  Nguyễn An  ", "  customer@hotel.demo ", " 0900000001 ", "  Tầng cao  ");
            assertTrue(validator.validate(valid).isEmpty());
            assertEquals("Nguyễn An", valid.customerName());
            assertEquals("customer@hotel.demo", valid.email());
            assertEquals("0900000001", valid.phone());
            assertEquals("Tầng cao", valid.specialRequests());

            var blankSpecial = new CreateBookingRequest(2L, checkIn, checkOut, 1, 1,
                    "An", "an@example.com", "0900000001", "   ");
            assertNull(blankSpecial.specialRequests());
            assertTrue(validator.validate(blankSpecial).isEmpty());

            var invalid = new CreateBookingRequest(null, null, null, 0, 11,
                    "  ", "not-an-email", " ", "x".repeat(2001));
            assertTrue(validator.validate(invalid).size() >= 7);
        }
    }

    private CreateBookingRequest request(int rooms, int guests, String customerName) {
        return request(rooms, guests, customerName, checkIn, checkOut);
    }

    private CreateBookingRequest request(int rooms, int guests, String customerName,
                                         LocalDate from, LocalDate to) {
        return new CreateBookingRequest(2L, from, to, guests, rooms,
                customerName, "customer@hotel.demo", "0900000001", "Tầng cao");
    }

    private static RoomTypeSnapshot deluxe() {
        return new RoomTypeSnapshot(2L, 1L, "Deluxe", new BigDecimal("800000"), 3, true, true);
    }

    private static AvailableRoom room(long id, String number) {
        return new AvailableRoom(id, number);
    }
}
