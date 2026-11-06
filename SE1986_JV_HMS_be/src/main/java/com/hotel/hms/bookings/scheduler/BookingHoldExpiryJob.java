package com.hotel.hms.bookings.scheduler;

import com.hotel.hms.bookings.service.BookingHoldExpiryService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Job quét booking PENDING hết hạn giữ chỗ và nhả phòng.
 *
 * <p>Chạy mỗi {@code booking.hold-scan-ms} (mặc định 60s) sau khoảng chờ ban đầu
 * {@code booking.hold-scan-initial-ms}. Việc tìm phòng trống không phụ thuộc job
 * này — procedure đã dựa vào {@code hold_expires_at} — nên phòng được nhả ngay
 * khi hết hạn, job chỉ cập nhật trạng thái hiển thị.</p>
 */
@Slf4j
@Component
public class BookingHoldExpiryJob {

    private final BookingHoldExpiryService service;

    public BookingHoldExpiryJob(BookingHoldExpiryService service) {
        this.service = service;
    }

    @Scheduled(
            fixedDelayString = "${booking.hold-scan-ms:60000}",
            initialDelayString = "${booking.hold-scan-initial-ms:15000}"
    )
    public void releaseExpiredHolds() {
        try {
            int expired = service.expireOverdueHolds();
            if (expired > 0) {
                log.info("Released {} expired booking hold(s)", expired);
            }
        } catch (RuntimeException exception) {
            // Không để một lỗi DB tạm thời làm dừng scheduler.
            log.warn("Could not release expired booking holds: {}", exception.getMessage());
        }
    }
}
