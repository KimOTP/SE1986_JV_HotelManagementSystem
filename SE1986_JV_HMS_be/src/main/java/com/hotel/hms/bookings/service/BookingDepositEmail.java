package com.hotel.hms.bookings.service;

import com.hotel.hms.bookings.service.BookingDepositService.BookingDepositConfirmed;
import com.hotel.hms.identity.mail.MailProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Component
@RequiredArgsConstructor
@Slf4j
public class BookingDepositEmail {

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private final ObjectProvider<JavaMailSender> mailSender;
    private final MailProperties properties;

    @TransactionalEventListener
    public void sendConfirmation(BookingDepositConfirmed event) {
        var booking = event.booking();
        if (!properties.isConfigured() || booking.email() == null || booking.email().isBlank()) {
            log.warn("Booking confirmation email skipped for {}", booking.bookingCode());
            return;
        }
        try {
            JavaMailSender sender = mailSender.getIfAvailable();
            if (sender == null) {
                log.warn("Booking confirmation SMTP sender unavailable for {}", booking.bookingCode());
                return;
            }
            var message = new SimpleMailMessage();
            message.setFrom(properties.sender());
            message.setTo(booking.email());
            message.setSubject("Đặt cọc và đặt phòng thành công - " + booking.bookingCode());
            message.setText("""
                    Xin chào %s,

                    Khách sạn đã nhận tiền đặt cọc qua payOS và xác nhận đặt phòng của bạn.

                    Mã đặt phòng: %s
                    Tiền cọc đã nhận: %s ₫
                    Nhận phòng: %s
                    Trả phòng: %s

                    Vui lòng giữ mã đặt phòng để làm thủ tục nhận phòng.

                    Hotel Management System
                    """.formatted(booking.customerName(), booking.bookingCode(),
                    NumberFormat.getIntegerInstance(Locale.forLanguageTag("vi-VN")).format(event.amount()),
                    DATE.format(booking.checkIn()), DATE.format(booking.checkOut())));
            sender.send(message);
        } catch (MailException exception) {
            log.warn("Booking confirmation email failed for {} ({})",
                    booking.bookingCode(), exception.getClass().getSimpleName());
        }
    }
}
