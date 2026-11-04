package com.hotel.hms.bookings.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Payload used by the customer booking form ({@code /bookings/new}).
 *
 * <p>The client never sends a price or a deposit: both are recomputed from the
 * room type loaded inside the booking transaction.</p>
 */
public record CreateBookingRequest(
        @NotNull(message = "Vui lòng chọn loại phòng.")
        @Positive(message = "Loại phòng không hợp lệ.")
        Long roomTypeId,

        @NotNull(message = "Vui lòng chọn ngày nhận phòng.")
        LocalDate checkIn,

        @NotNull(message = "Vui lòng chọn ngày trả phòng.")
        LocalDate checkOut,

        @NotNull(message = "Vui lòng nhập số khách.")
        @Min(value = 1, message = "Số khách phải từ 1 trở lên.")
        @Max(value = 50, message = "Số khách tối đa là 50.")
        Integer guests,

        @NotNull(message = "Vui lòng nhập số phòng.")
        @Min(value = 1, message = "Số phòng phải từ 1 trở lên.")
        @Max(value = 10, message = "Số phòng tối đa là 10.")
        Integer rooms,

        @NotBlank(message = "Vui lòng nhập họ tên.")
        @Size(max = 150, message = "Họ tên tối đa 150 ký tự.")
        String customerName,

        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không hợp lệ.")
        @Size(max = 254, message = "Email tối đa 254 ký tự.")
        String email,

        @NotBlank(message = "Vui lòng nhập số điện thoại.")
        @Size(max = 20, message = "Số điện thoại tối đa 20 ký tự.")
        String phone,

        @Size(max = 2000, message = "Yêu cầu đặc biệt tối đa 2000 ký tự.")
        String specialRequests
) {

    public CreateBookingRequest {
        customerName = trim(customerName);
        email = trim(email);
        phone = trim(phone);
        specialRequests = trimToNull(specialRequests);
    }

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }

    private static String trimToNull(String value) {
        String trimmed = trim(value);
        return trimmed == null || trimmed.isEmpty() ? null : trimmed;
    }
}
