package com.hotel.hms.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên.")
        @Size(min = 2, max = 100, message = "Họ và tên phải có từ 2 đến 100 ký tự.")
        String fullName,

        // Không bắt buộc; để trống thì xóa số điện thoại.
        @Pattern(regexp = "^[0-9+() -]{8,20}$", message = "Số điện thoại không hợp lệ.")
        String phone
) {
    public UpdateProfileRequest {
        fullName = fullName == null ? null : fullName.trim();
        phone = phone == null || phone.isBlank() ? null : phone.trim();
    }
}
