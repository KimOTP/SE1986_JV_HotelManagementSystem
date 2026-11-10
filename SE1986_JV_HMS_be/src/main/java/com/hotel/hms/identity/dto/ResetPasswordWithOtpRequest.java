package com.hotel.hms.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordWithOtpRequest(
        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không hợp lệ.")
        @Size(max = 254, message = "Email không được vượt quá 254 ký tự.")
        String email,

        @NotBlank(message = "Vui lòng nhập mã xác nhận.")
        @Pattern(regexp = "^\\d{6}$", message = "Mã xác nhận gồm 6 chữ số.")
        String otp,

        @NotBlank(message = "Vui lòng nhập mật khẩu mới.")
        @Size(min = 6, max = 72, message = "Mật khẩu mới phải có từ 6 đến 72 ký tự.")
        String newPassword
) {
    public ResetPasswordWithOtpRequest {
        email = email == null ? null : email.trim();
        otp = otp == null ? null : otp.trim();
    }
}
