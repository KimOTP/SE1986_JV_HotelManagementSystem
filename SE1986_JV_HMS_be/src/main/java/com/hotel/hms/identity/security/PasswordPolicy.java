package com.hotel.hms.identity.security;

import com.hotel.hms.common.exception.BadRequestException;

import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

public final class PasswordPolicy {

    // BCrypt chỉ dùng được 72 byte đầu; ký tự tiếng Việt có thể chiếm nhiều byte.
    private static final int BCRYPT_MAX_BYTES = 72;
    private static final int TEMPORARY_LENGTH = 12;
    // Bỏ các ký tự dễ nhầm (0/O, 1/l/I) vì mật khẩu tạm được đọc và gõ lại bằng tay.
    private static final String TEMPORARY_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordPolicy() {
    }

    public static void assertFitsBcrypt(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_BYTES) {
            throw new BadRequestException("PASSWORD_TOO_LONG", "Mật khẩu quá dài.");
        }
    }

    public static String generateTemporary() {
        StringBuilder password = new StringBuilder(TEMPORARY_LENGTH);
        for (int i = 0; i < TEMPORARY_LENGTH; i++) {
            password.append(TEMPORARY_ALPHABET.charAt(RANDOM.nextInt(TEMPORARY_ALPHABET.length())));
        }
        return password.toString();
    }
}
