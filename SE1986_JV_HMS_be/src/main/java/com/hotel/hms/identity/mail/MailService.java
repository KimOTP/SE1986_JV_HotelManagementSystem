package com.hotel.hms.identity.mail;

public interface MailService {

    /** Gửi mã OTP đặt lại mật khẩu. Ném lỗi nếu không gửi được để nơi gọi quyết định xử lý. */
    void sendPasswordResetOtp(String to, String fullName, String otp, int ttlMinutes);
}
