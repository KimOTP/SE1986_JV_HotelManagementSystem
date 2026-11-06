package com.hotel.hms.bookings.dto;

import jakarta.validation.constraints.Size;

/**
 * Body của {@code POST /api/bookings/{bookingCode}/cancel}. Lý do không bắt
 * buộc; nếu có thì được lưu vào {@code booking.bookings.cancel_reason} và
 * {@code booking_status_history.note}.
 */
public record CancelBookingRequest(
        @Size(max = 1000, message = "lý do hủy tối đa 1000 ký tự")
        String reason
) {
}
