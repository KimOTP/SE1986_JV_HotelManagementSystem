package com.hotel.hms.bookings;

import com.hotel.hms.bookings.dto.BookingResponse;
import com.hotel.hms.bookings.repository.BookingQueryRepository;
import com.hotel.hms.bookings.repository.BookingQueryRepository.BookingRoomRow;
import com.hotel.hms.bookings.repository.BookingQueryRepository.BookingRow;
import com.hotel.hms.bookings.service.BookingQueryService;
import com.hotel.hms.common.exception.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BookingQueryServiceTests {

    private static final LocalDate CHECK_IN = LocalDate.of(2035, 1, 10);
    private static final LocalDate CHECK_OUT = LocalDate.of(2035, 1, 12);

    private BookingQueryRepository repository;
    private BookingQueryService service;

    @BeforeEach
    void setUp() {
        repository = mock(BookingQueryRepository.class);
        service = new BookingQueryService(repository);
    }

    @Test
    void mapsBookingWithRoomsToSameShapeAsCreation() {
        when(repository.findByCustomer(5L, null, 0, 20)).thenReturn(List.of(booking("PENDING")));
        when(repository.findRooms(List.of(99L))).thenReturn(rooms());

        List<BookingResponse> result = service.listMine(5L, "", 0, 20);

        assertEquals(1, result.size());
        BookingResponse response = result.get(0);
        assertEquals(99L, response.bookingId());
        assertEquals("BK-TEST", response.id());
        assertEquals("BK-TEST", response.bookingCode());
        assertEquals("Deluxe", response.roomTypeName());
        assertEquals(2L, response.roomTypeId());
        assertEquals(2, response.nights());
        assertEquals(2, response.guests());
        assertEquals(1, response.rooms());
        assertEquals(new BigDecimal("800000.00"), response.pricePerNight());
        assertEquals(new BigDecimal("1600000.00"), response.totalAmount());
        assertEquals(new BigDecimal("480000.00"), response.depositRequired());
        assertEquals(new BigDecimal("480000.00"), response.depositPaid());
        assertEquals("PENDING", response.status());
        assertEquals("Nguyễn An", response.customerName());
        assertEquals(List.of(new BookingResponse.AssignedRoom(4L, "201")), response.assignedRooms());
        assertNull(response.cancelReason());
        assertNull(response.cancelledAt());
    }

    @Test
    void sumsNightlyRatesAcrossMultipleRoomsAndTypes() {
        when(repository.findByCustomer(5L, null, 0, 20)).thenReturn(List.of(booking("CONFIRMED")));
        when(repository.findRooms(List.of(99L))).thenReturn(List.of(
                new BookingRoomRow(99L, 4L, "201", 2L, "Deluxe", new BigDecimal("800000.00")),
                new BookingRoomRow(99L, 5L, "202", 3L, "Family", new BigDecimal("1200000.00"))
        ));

        BookingResponse response = service.listMine(5L, null, 0, 20).get(0);

        assertEquals(2, response.rooms());
        assertEquals(new BigDecimal("1000000.00"), response.pricePerNight());
        assertEquals(new BigDecimal("4000000.00"), response.totalAmount());
        assertEquals("Deluxe, Family", response.roomTypeName());
        assertNull(response.roomTypeId());
    }

    @Test
    void appliesStatusFilterAndPaging() {
        when(repository.findByCustomer(5L, "CONFIRMED", 20, 10)).thenReturn(List.of());

        List<BookingResponse> result = service.listMine(5L, "  confirmed ", 2, 10);

        assertTrue(result.isEmpty());
        verify(repository).findByCustomer(5L, "CONFIRMED", 20, 10);
        verify(repository, never()).findRooms(any());
    }

    @Test
    void rejectsUnknownStatusFilter() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.listMine(5L, "DONE", 0, 20));

        assertEquals("BOOKING_INVALID_STATUS", error.getCode());
        verify(repository, never()).findByCustomer(anyLong(), any(), anyInt(), anyInt());
    }

    @Test
    void rejectsInvalidPaging() {
        assertEquals("BOOKING_INVALID_PAGE",
                assertThrows(ApiException.class, () -> service.listMine(5L, null, -1, 20)).getCode());
        assertEquals("BOOKING_INVALID_PAGE_SIZE",
                assertThrows(ApiException.class, () -> service.listMine(5L, null, 0, 0)).getCode());
        assertEquals("BOOKING_INVALID_PAGE_SIZE",
                assertThrows(ApiException.class, () -> service.listMine(5L, null, 0, 101)).getCode());
    }

    @Test
    void detailHidesAnotherCustomersBooking() {
        when(repository.findByCode("BK-TEST")).thenReturn(Optional.of(booking("PENDING")));

        ApiException error = assertThrows(ApiException.class,
                () -> service.getByCode(7L, "BK-TEST", false));

        assertEquals("BOOKING_NOT_FOUND", error.getCode());
        verify(repository, never()).findRooms(any());
    }

    @Test
    void detailAllowsStaffViewerForAnyBooking() {
        when(repository.findByCode("BK-TEST")).thenReturn(Optional.of(booking("PENDING")));
        when(repository.findRooms(List.of(99L))).thenReturn(rooms());

        BookingResponse response = service.getByCode(9L, "BK-TEST", true);

        assertEquals("BK-TEST", response.bookingCode());
    }

    @Test
    void cancellationRejectsCheckedInBooking() {
        when(repository.findByCode("BK-TEST")).thenReturn(Optional.of(booking("CHECKED_IN")));

        ApiException error = assertThrows(ApiException.class,
                () -> service.cancel(5L, "BK-TEST", "Đổi kế hoạch"));

        assertEquals("BOOKING_NOT_CANCELLABLE", error.getCode());
        verify(repository, never()).cancel(anyLong(), any(), any());
    }

    @Test
    void cancellationWritesStatusHistoryAndReturnsCancelledBooking() {
        when(repository.findByCode("BK-TEST"))
                .thenReturn(Optional.of(booking("PENDING")), Optional.of(cancelled()));
        when(repository.cancel(eq(99L), eq("Đổi kế hoạch"), any())).thenReturn(1);
        when(repository.findRooms(List.of(99L))).thenReturn(rooms());

        BookingResponse response = service.cancel(5L, "BK-TEST", "  Đổi kế hoạch  ");

        assertEquals("CANCELLED", response.status());
        assertEquals("Đổi kế hoạch", response.cancelReason());
        verify(repository).cancel(eq(99L), eq("Đổi kế hoạch"), any());

        ArgumentCaptor<String> note = ArgumentCaptor.forClass(String.class);
        verify(repository).insertCancellationHistory(eq(99L), eq("PENDING"), eq(5L), note.capture());
        assertEquals("Khách hủy: Đổi kế hoạch", note.getValue());
    }

    @Test
    void cancellationWithoutReasonUsesDefaultHistoryNote() {
        when(repository.findByCode("BK-TEST"))
                .thenReturn(Optional.of(booking("CONFIRMED")), Optional.of(cancelled()));
        when(repository.cancel(eq(99L), eq((String) null), any())).thenReturn(1);
        when(repository.findRooms(List.of(99L))).thenReturn(rooms());

        service.cancel(5L, "BK-TEST", "   ");

        verify(repository).insertCancellationHistory(99L, "CONFIRMED", 5L, "Khách hủy đặt phòng");
    }

    @Test
    void cancellationRejectsTooLongReason() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.cancel(5L, "BK-TEST", "x".repeat(1001)));

        assertEquals("BOOKING_CANCEL_REASON_TOO_LONG", error.getCode());
        verify(repository, never()).findByCode(any());
    }

    @Test
    void cancellationDetectsConcurrentStatusChange() {
        when(repository.findByCode("BK-TEST")).thenReturn(Optional.of(booking("PENDING")));
        when(repository.cancel(eq(99L), any(), any())).thenReturn(0);

        ApiException error = assertThrows(ApiException.class,
                () -> service.cancel(5L, "BK-TEST", "Đổi kế hoạch"));

        assertEquals("BOOKING_CANCEL_CONFLICT", error.getCode());
        verify(repository, never()).insertCancellationHistory(anyLong(), any(), anyLong(), any());
    }

    private static BookingRow booking(String status) {
        return new BookingRow(99L, "BK-TEST", 5L, 1L, CHECK_IN, CHECK_OUT, 2, status,
                "Nguyễn An", "customer@hotel.demo", "0900000001", "Tầng cao",
                new BigDecimal("480000.00"), new BigDecimal("480000.00"),
                LocalDateTime.of(2035, 1, 1, 10, 0), null, null,
                LocalDateTime.of(2035, 1, 1, 9, 30));
    }

    private static BookingRow cancelled() {
        return new BookingRow(99L, "BK-TEST", 5L, 1L, CHECK_IN, CHECK_OUT, 2, "CANCELLED",
                "Nguyễn An", "customer@hotel.demo", "0900000001", "Tầng cao",
                new BigDecimal("480000.00"), new BigDecimal("480000.00"),
                LocalDateTime.of(2035, 1, 1, 10, 0), "Đổi kế hoạch",
                LocalDateTime.of(2035, 1, 2, 8, 0), LocalDateTime.of(2035, 1, 1, 9, 30));
    }

    private static List<BookingRoomRow> rooms() {
        return List.of(new BookingRoomRow(99L, 4L, "201", 2L, "Deluxe",
                new BigDecimal("800000.00")));
    }
}
