package com.hotel.hms.identity.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.otp")
public record OtpProperties(
        // Mã OTP hết hạn sau bấy nhiêu phút.
        int ttlMinutes,
        // Phải chờ bấy nhiêu giây mới được xin mã mới, để không bị dùng làm công cụ spam mail.
        int resendCooldownSeconds,
        // Nhập sai quá số lần này thì mã bị hủy và phải xin mã mới.
        int maxAttempts
) {
}
