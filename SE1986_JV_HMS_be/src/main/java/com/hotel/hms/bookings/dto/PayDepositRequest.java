package com.hotel.hms.bookings.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Body của {@code POST /api/bookings/{bookingCode}/deposit}.
 *
 * <p>Chỉ chấp nhận kênh thanh toán trực tuyến: {@code BANK_TRANSFER},
 * {@code CREDIT_CARD}, {@code E_WALLET}. Tiền mặt không áp dụng cho luồng đặt
 * phòng online.</p>
 */
public record PayDepositRequest(
        @NotBlank(message = "phương thức thanh toán không được để trống")
        @Size(max = 30, message = "phương thức thanh toán tối đa 30 ký tự")
        String method
) {
}
