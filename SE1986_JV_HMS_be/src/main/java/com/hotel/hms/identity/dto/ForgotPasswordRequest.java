package com.hotel.hms.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ForgotPasswordRequest(
        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không hợp lệ.")
        @Size(max = 254, message = "Email không được vượt quá 254 ký tự.")
        String email
) {
    public ForgotPasswordRequest {
        email = email == null ? null : email.trim();
    }
}
