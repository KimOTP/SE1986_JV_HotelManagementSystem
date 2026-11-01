package com.hotel.hms.identity.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.jwt")
public record JwtProperties(
        // Chuỗi Base64 của khóa HMAC, tối thiểu 32 byte sau khi decode.
        String secretBase64,
        String issuer,
        long accessTokenTtlSeconds,
        long refreshTokenTtlSeconds
) {
}
