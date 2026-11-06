package com.hotel.hms.bookings;

import com.hotel.hms.bookings.dto.BookingResponse;
import com.hotel.hms.bookings.repository.BookingPaymentRepository;
import com.hotel.hms.bookings.repository.BookingPaymentRepository.PaymentTarget;
import com.hotel.hms.bookings.service.BookingDepositService;
import com.hotel.hms.bookings.service.BookingQueryService;
import com.hotel.hms.common.exception.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class BookingDepositServiceTests {

    private BookingPaymentRepository repository;
    private BookingQueryService queryService;
    private BookingDepositService service;

    @BeforeEach
    void setUp() {
        repository = mock(BookingPaymentRepository.class);
        queryService = mock(BookingQueryService.class);
        service = new BookingDepositService(repository, queryService);
    }

    @Test
    void recordsDepositAndConfirmsBooking() {
        when(repository.lockBooking("BK-TEST"))
                .thenReturn(Optional.of(target("PENDING", futureHold(), new BigDecimal("480000.00"))));
        when(repository.confirmAfterDeposit(eq(99L), any())).thenReturn(1);
        when(queryService.getByCode(5L, "BK-TEST", false)).thenReturn(confirmedResponse());

        BookingResponse response = service.payDeposit(5L, "BK-TEST", "bank_transfer");

        assertEquals("CONFIRMED", response.status());
        assertEquals(new BigDecimal("480000.00"), response.depositPaid());

        ArgumentCaptor<String> method = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> transactionCode = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<BigDecimal> amount = ArgumentCaptor.forClass(BigDecimal.class);
        verify(repository).insertDepositTransaction(eq(99L), transactionCode.capture(),
                method.capture(), amount.capture(), any());

        assertEquals("BANK_TRANSFER", method.getValue());
        assertEquals(new BigDecimal("480000.00"), amount.getValue());
        assertTrue(transactionCode.getValue().startsWith("DEP-"));

        ArgumentCaptor<String> note = ArgumentCaptor.forClass(String.class);
        verify(repository).insertStatusHistory(eq(99L), eq("PENDING"), eq("CONFIRMED"),
                eq(5L), note.capture());
        assertTrue(note.getValue().contains("Đã thanh toán tiền cọc"));
        assertTrue(note.getValue().contains("BANK_TRANSFER"));
    }

    @Test
    void cardAndWalletAreRecordedAsGatewayInDatabase() {
        when(repository.lockBooking("BK-TEST"))
                .thenReturn(Optional.of(target("PENDING", futureHold(), new BigDecimal("480000.00"))));
        when(repository.confirmAfterDeposit(eq(99L), any())).thenReturn(1);
        when(queryService.getByCode(5L, "BK-TEST", false)).thenReturn(confirmedResponse());

        service.payDeposit(5L, "BK-TEST", "CREDIT_CARD");
        service.payDeposit(5L, "BK-TEST", "E_WALLET");

        ArgumentCaptor<String> method = ArgumentCaptor.forClass(String.class);
        verify(repository, org.mockito.Mockito.times(2))
                .insertDepositTransaction(eq(99L), any(), method.capture(), any(), any());
        assertEquals(List.of("GATEWAY", "GATEWAY"), method.getAllValues());
    }

    @Test
    void rejectsCashAndUnknownMethodsBeforeTouchingDatabase() {
        ApiException cash = assertThrows(ApiException.class,
                () -> service.payDeposit(5L, "BK-TEST", "CASH"));
        assertEquals("BOOKING_PAYMENT_METHOD_INVALID", cash.getCode());

        ApiException unknown = assertThrows(ApiException.class,
                () -> service.payDeposit(5L, "BK-TEST", "PAYPAL"));
        assertEquals("BOOKING_PAYMENT_METHOD_INVALID", unknown.getCode());

        verifyNoInteractions(repository);
    }

    @Test
    void rejectsBlankMethodAndBookingCode() {
        assertEquals("BOOKING_PAYMENT_METHOD_REQUIRED",
                assertThrows(ApiException.class,
                        () -> service.payDeposit(5L, "BK-TEST", " ")).getCode());
        assertEquals("BOOKING_CODE_REQUIRED",
                assertThrows(ApiException.class,
                        () -> service.payDeposit(5L, null, "BANK_TRANSFER")).getCode());
        verifyNoInteractions(repository);
    }

    @Test
    void hidesBookingsOfOtherCustomers() {
        when(repository.lockBooking("BK-TEST"))
                .thenReturn(Optional.of(new PaymentTarget(99L, "BK-TEST", 7L, "PENDING",
                        new BigDecimal("480000.00"), futureHold())));

        ApiException error = assertThrows(ApiException.class,
                () -> service.payDeposit(5L, "BK-TEST", "BANK_TRANSFER"));

        assertEquals("BOOKING_NOT_FOUND", error.getCode());
        verify(repository, never()).insertDepositTransaction(anyLong(), any(), any(), any(), any());
    }

    @Test
    void rejectsBookingThatIsNoLongerPending() {
        when(repository.lockBooking("BK-TEST"))
                .thenReturn(Optional.of(target("CONFIRMED", futureHold(), new BigDecimal("480000.00"))));

        ApiException error = assertThrows(ApiException.class,
                () -> service.payDeposit(5L, "BK-TEST", "BANK_TRANSFER"));

        assertEquals("BOOKING_NOT_PAYABLE", error.getCode());
        verify(repository, never()).insertDepositTransaction(anyLong(), any(), any(), any(), any());
    }

    @Test
    void rejectsExpiredHold() {
        LocalDateTime past = LocalDateTime.now(ZoneOffset.UTC).minusMinutes(1);
        when(repository.lockBooking("BK-TEST"))
                .thenReturn(Optional.of(target("PENDING", past, new BigDecimal("480000.00"))));

        ApiException error = assertThrows(ApiException.class,
                () -> service.payDeposit(5L, "BK-TEST", "BANK_TRANSFER"));

        assertEquals("BOOKING_HOLD_EXPIRED", error.getCode());
        verify(repository, never()).confirmAfterDeposit(anyLong(), any());
    }

    @Test
    void rollsBackWhenAnotherFlowChangedStatusFirst() {
        when(repository.lockBooking("BK-TEST"))
                .thenReturn(Optional.of(target("PENDING", futureHold(), new BigDecimal("480000.00"))));
        when(repository.confirmAfterDeposit(eq(99L), any())).thenReturn(0);

        ApiException error = assertThrows(ApiException.class,
                () -> service.payDeposit(5L, "BK-TEST", "BANK_TRANSFER"));

        assertEquals("BOOKING_PAYMENT_CONFLICT", error.getCode());
        verify(repository, never()).insertStatusHistory(anyLong(), any(), any(), any(), any());
    }

    @Test
    void rejectsBookingWithoutDeposit() {
        when(repository.lockBooking("BK-TEST"))
                .thenReturn(Optional.of(target("PENDING", futureHold(), BigDecimal.ZERO)));

        ApiException error = assertThrows(ApiException.class,
                () -> service.payDeposit(5L, "BK-TEST", "BANK_TRANSFER"));

        assertEquals("BOOKING_DEPOSIT_NOT_REQUIRED", error.getCode());
        verify(repository, never()).insertDepositTransaction(anyLong(), any(), any(), any(), any());
    }

    @Test
    void returnsNotFoundWhenBookingDoesNotExist() {
        when(repository.lockBooking("BK-MISSING")).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class,
                () -> service.payDeposit(5L, "BK-MISSING", "BANK_TRANSFER"));

        assertEquals("BOOKING_NOT_FOUND", error.getCode());
    }

    private static LocalDateTime futureHold() {
        return LocalDateTime.now(ZoneOffset.UTC).plusMinutes(10).truncatedTo(ChronoUnit.MILLIS);
    }

    private static PaymentTarget target(String status, LocalDateTime hold, BigDecimal deposit) {
        return new PaymentTarget(99L, "BK-TEST", 5L, status, deposit, hold);
    }

    private static BookingResponse confirmedResponse() {
        return new BookingResponse(
                99L, "BK-TEST", "BK-TEST", 5L, 1L, 2L, "Deluxe",
                LocalDate.of(2035, 1, 10), LocalDate.of(2035, 1, 12), 2, 2, 1,
                new BigDecimal("800000.00"), new BigDecimal("1600000.00"),
                new BigDecimal("480000.00"), new BigDecimal("480000.00"), "CONFIRMED",
                LocalDateTime.of(2035, 1, 1, 10, 0),
                LocalDateTime.of(2035, 1, 1, 9, 30),
                "Nguyễn An", "customer@hotel.demo", "0900000001", "Tầng cao",
                List.of(new BookingResponse.AssignedRoom(4L, "201")),
                null, null
        );
    }
}
