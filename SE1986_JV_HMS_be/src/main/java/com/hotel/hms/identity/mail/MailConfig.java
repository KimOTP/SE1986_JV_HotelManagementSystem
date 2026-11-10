package com.hotel.hms.identity.mail;

import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.nio.charset.StandardCharsets;
import java.util.Properties;

@Configuration
@EnableConfigurationProperties({MailProperties.class, OtpProperties.class})
public class MailConfig {

    // Chỉ tạo bean khi có MAIL_HOST; không có thì SmtpMailService chuyển sang chế độ ghi log.
    @Bean
    @ConditionalOnExpression("!'${app.mail.host:}'.isBlank()")
    public JavaMailSender javaMailSender(MailProperties properties) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(properties.host());
        sender.setPort(properties.port());
        sender.setDefaultEncoding(StandardCharsets.UTF_8.name());
        boolean authenticated = properties.username() != null && !properties.username().isBlank();
        if (authenticated) {
            sender.setUsername(properties.username());
            sender.setPassword(properties.password());
        }
        Properties mail = sender.getJavaMailProperties();
        mail.put("mail.smtp.auth", String.valueOf(authenticated));
        mail.put("mail.smtp.starttls.enable", String.valueOf(properties.starttls()));
        mail.put("mail.smtp.connectiontimeout", "5000");
        mail.put("mail.smtp.timeout", "10000");
        mail.put("mail.smtp.writetimeout", "10000");
        return sender;
    }
}
