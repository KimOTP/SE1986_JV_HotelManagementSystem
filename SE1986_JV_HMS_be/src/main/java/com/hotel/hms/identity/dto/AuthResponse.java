package com.hotel.hms.identity.dto;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        // Số giây access token còn hiệu lực.
        long expiresIn,
        UserResponse user
) {
}
