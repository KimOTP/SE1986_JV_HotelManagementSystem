package com.hotel.hms.identity.mail;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Cấu hình SMTP. Để trống host thì không gửi mail thật (chỉ dùng khi phát triển, xem SmtpMailService). */
@ConfigurationProperties(prefix = "app.mail")
public record MailProperties(
        String host,
        int port,
        String username,
        String password,
        String from,
        boolean starttls
) {
    public boolean isConfigured() {
        return host != null && !host.isBlank();
    }

    public String sender() {
        return from != null && !from.isBlank() ? from : username;
    }
}
