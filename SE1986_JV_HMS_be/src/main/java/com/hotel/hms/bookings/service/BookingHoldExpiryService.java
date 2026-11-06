package com.hotel.hms.bookings.service;

import com.hotel.hms.bookings.repository.BookingQueryRepository;
import com.hotel.hms.bookings.repository.BookingQueryRepository.ExpiredHold;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Nhả phòng khi booking PENDING quá hạn giữ chỗ (mặc định 15 phút).
 *
 * <p>Việc "nhả phòng" thực tế do {@code inventory.search_available_rooms} quyết
 * định: procedure chỉ coi booking PENDING là đang chiếm phòng khi
 * {@code hold_expires_at > SYSUTCDATETIME()}. Service này chỉ đồng bộ trạng thái
 * PENDING → EXPIRED để khách và các API đọc thấy đúng, đồng thời ghi lịch sử.</p>
 */
@Service
public class BookingHoldExpiryService {

    private static final int BATCH_SIZE = 200;

    private final BookingQueryRepository repository;
    private final long holdMinutes;

    public BookingHoldExpiryService(BookingQueryRepository repository,
                                    @Value("${booking.hold-minutes:15}") long holdMinutes) {
        this.repository = repository;
        this.holdMinutes = holdMinutes;
    }

    /**
     * Quét một lô booking hết hạn và chuyển sang EXPIRED. Trả về số booking đã
     * đổi trạng thái trong lần chạy này.
     */
    @Transactional
    public int expireOverdueHolds() {
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MILLIS);
        List<ExpiredHold> holds = repository.findExpiredHolds(now, BATCH_SIZE);

        int expired = 0;
        for (ExpiredHold hold : holds) {
            // Nếu thanh toán/hủy vừa đổi trạng thái trước đó, UPDATE trả 0 và bỏ qua.
            if (repository.expireHold(hold.bookingId(), now) == 1) {
                repository.insertStatusHistory(hold.bookingId(), "PENDING", "EXPIRED", null,
                        "Hết hạn giữ chỗ sau " + Math.max(1, holdMinutes) + " phút");
                expired++;
            }
        }
        return expired;
    }
}
