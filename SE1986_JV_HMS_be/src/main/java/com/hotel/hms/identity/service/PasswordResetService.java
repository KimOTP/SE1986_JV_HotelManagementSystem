package com.hotel.hms.identity.service;

/** UC-A3: quên mật khẩu bằng mã OTP gửi qua email. */
public interface PasswordResetService {

    /**
     * Gửi mã OTP tới email. Luôn kết thúc bình thường dù email có tồn tại hay không,
     * để người ngoài không dò được email nào đã đăng ký.
     */
    void requestReset(String email);

    /** Đổi mật khẩu bằng mã OTP; thành công thì mọi phiên đăng nhập cũ bị thu hồi. */
    void resetPassword(String email, String otp, String newPassword);
}
