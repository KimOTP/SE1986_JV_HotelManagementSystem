package com.hotel.hms.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại.")
        @Size(max = 100, message = "Mật khẩu hiện tại không chính xác.")
        String currentPassword,

        @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
        @Size(min = 6, max = 72, message = "Mật khẩu mới phải có từ 6 đến 72 ký tự.")
        String newPassword
) {
}
