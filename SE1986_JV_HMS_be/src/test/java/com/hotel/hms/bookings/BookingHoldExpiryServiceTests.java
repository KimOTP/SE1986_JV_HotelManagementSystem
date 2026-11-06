package com.hotel.hms.bookings;

import com.hotel.hms.bookings.repository.BookingQueryRepository;
import com.hotel.hms.bookings.repository.BookingQueryRepository.ExpiredHold;
import com.hotel.hms.bookings.service.BookingHoldExpiryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BookingHoldExpiryServiceTests {

    private BookingQueryRepository repository;
    private BookingHoldExpiryService service;

    @BeforeEach
    void setUp() {
        repository = mock(BookingQueryRepository.class);
        service = new BookingHoldExpiryService(repository, 15);
    }

    @Test
    void expiresEveryOverduePendingBookingAndWritesHistory() {
        when(repository.findExpiredHolds(any(), eq(200))).thenReturn(List.of(
                new ExpiredHold(10L, "BK-111"),
                new ExpiredHold(11L, "BK-222")
        ));
        when(repository.expireHold(eq(10L), any())).thenReturn(1);
        when(repository.expireHold(eq(11L), any())).thenReturn(1);

        int expired = service.expireOverdueHolds();

        assertEquals(2, expired);
        verify(repository).insertStatusHistory(eq(10L), eq("PENDING"), eq("EXPIRED"),
                isNull(), eq("Hết hạn giữ chỗ sau 15 phút"));
        verify(repository).insertStatusHistory(eq(11L), eq("PENDING"), eq("EXPIRED"),
                isNull(), eq("Hết hạn giữ chỗ sau 15 phút"));
    }

    @Test
    void skipsBookingChangedByAnotherFlow() {
        when(repository.findExpiredHolds(any(), eq(200)))
                .thenReturn(List.of(new ExpiredHold(10L, "BK-111")));
        when(repository.expireHold(eq(10L), any())).thenReturn(0);

        int expired = service.expireOverdueHolds();

        assertEquals(0, expired);
        verify(repository, never()).insertStatusHistory(anyLong(), any(), any(), any(), any());
    }

    @Test
    void doesNothingWhenNoHoldIsOverdue() {
        when(repository.findExpiredHolds(any(), eq(200))).thenReturn(List.of());

        assertEquals(0, service.expireOverdueHolds());
        verify(repository, never()).expireHold(anyLong(), any(LocalDateTime.class));
    }
}
