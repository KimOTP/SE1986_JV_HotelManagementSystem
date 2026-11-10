package com.hotel.hms.identity.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/** Tạo và kiểm tra access token (HMAC; khóa 64 byte nên jjwt ký bằng HS512). */
@Slf4j
@Component
public class JwtService {

    private final JwtProperties properties;
    private final SecretKey signingKey;

    public JwtService(JwtProperties properties) {
        this.properties = properties;
        if (properties.secretBase64() == null || properties.secretBase64().isBlank()) {
            // Không chặn khởi động máy chưa cấu hình; token sẽ mất hiệu lực sau mỗi lần restart.
            log.warn("JWT_SECRET_BASE64 is not set; using a random key for this run only");
            byte[] randomKey = new byte[64];
            new SecureRandom().nextBytes(randomKey);
            this.signingKey = Keys.hmacShaKeyFor(randomKey);
        } else {
            // hmacShaKeyFor từ chối khóa ngắn hơn 256 bit.
            this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(properties.secretBase64()));
        }
    }

    public String generateAccessToken(AuthUserDetails user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer(properties.issuer())
                .subject(user.getEmail())
                .claim("uid", user.getId())
                .claim("roles", user.getRoles())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(properties.accessTokenTtlSeconds())))
                .signWith(signingKey)
                .compact();
    }

    /** Ném JwtException nếu sai chữ ký, sai issuer, hết hạn hoặc sai định dạng. */
    public Claims parse(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(properties.issuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public long getAccessTokenTtlSeconds() {
        return properties.accessTokenTtlSeconds();
    }

    public long getRefreshTokenTtlSeconds() {
        return properties.refreshTokenTtlSeconds();
    }
}
