package com.hotel.hms.identity.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RefreshTokenRequest(
        @NotBlank(message = "Thiếu refresh token.")
        @Size(max = 200)
        String refreshToken
) {
}
