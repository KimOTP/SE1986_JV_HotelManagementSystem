package com.hotel.hms.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không hợp lệ.")
        @Size(max = 254)
        String email,

        @NotBlank(message = "Vui lòng nhập mật khẩu.")
        @Size(max = 100)
        String password
) {
}
