package com.hotel.hms.identity.mail;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmtpMailService implements MailService {

    private final ObjectProvider<JavaMailSender> mailSender;
    private final MailProperties properties;

    @Override
    public void sendPasswordResetOtp(String to, String fullName, String otp, int ttlMinutes) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            // Chỉ dành cho máy phát triển chưa cấu hình SMTP; không dùng khi triển khai thật.
            log.warn("MAIL_HOST is not set, mail not sent. Password reset code for {} is {}", to, otp);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(properties.sender());
        message.setTo(to);
        message.setSubject("Mã xác nhận đặt lại mật khẩu");
        message.setText("""
                Xin chào %s,

                Mã xác nhận để đặt lại mật khẩu của bạn là: %s

                Mã có hiệu lực trong %d phút. Không chia sẻ mã này với bất kỳ ai.
                Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.

                Hotel Management System
                """.formatted(fullName, otp, ttlMinutes));
        sender.send(message);
    }
}
