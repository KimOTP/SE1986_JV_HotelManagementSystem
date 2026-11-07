package com.hotel.hms.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên.")
        @Size(min = 2, max = 100, message = "Họ và tên phải có từ 2 đến 100 ký tự.")
        String fullName,

        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không hợp lệ.")
        @Size(max = 254, message = "Email không được vượt quá 254 ký tự.")
        String email,

        @NotBlank(message = "Vui lòng nhập mật khẩu.")
        @Size(min = 6, max = 72, message = "Mật khẩu phải có từ 6 đến 72 ký tự.")
        String password
) {
    // Bỏ khoảng trắng thừa trước khi validate, để "  a " không qua được kiểm tra độ dài.
    public RegisterRequest {
        fullName = fullName == null ? null : fullName.trim();
        email = email == null ? null : email.trim();
    }
}
