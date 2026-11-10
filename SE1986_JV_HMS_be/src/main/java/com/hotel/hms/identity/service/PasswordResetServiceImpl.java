package com.hotel.hms.identity.service;

import com.hotel.hms.common.exception.ApiException;
import com.hotel.hms.identity.entity.AuthToken;
import com.hotel.hms.identity.entity.TokenPurpose;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.mail.MailService;
import com.hotel.hms.identity.mail.OtpProperties;
import com.hotel.hms.identity.repository.AuthTokenRepository;
import com.hotel.hms.identity.repository.UserRepository;
import com.hotel.hms.identity.security.JwtProperties;
import com.hotel.hms.identity.security.PasswordPolicy;
import com.hotel.hms.identity.security.TokenHasher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class PasswordResetServiceImpl implements PasswordResetService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final AuthTokenRepository authTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final OtpProperties otpProperties;
    private final JwtProperties jwtProperties;

    // Số lần nhập sai theo từng tài khoản. Nằm trong bộ nhớ nên đủ cho một máy chủ; restart thì tính lại.
    private final Map<Long, Integer> failedAttempts = new ConcurrentHashMap<>();

    @Override
    @Transactional
    public void requestReset(String email) {
        LocalDateTime now = now();
        User user = userRepository.findByEmail(normalize(email)).orElse(null);
        if (user == null || !Boolean.TRUE.equals(user.getActive())) {
            return;
        }
        boolean tooSoon = authTokenRepository
                .findFirstByUser_IdAndPurposeOrderByCreatedAtDesc(user.getId(), TokenPurpose.PASSWORD_RESET)
                .filter(last -> last.getCreatedAt().plusSeconds(otpProperties.resendCooldownSeconds()).isAfter(now))
                .isPresent();
        if (tooSoon) {
            return;
        }

        // Mỗi tài khoản chỉ có một mã còn hiệu lực: mã cũ bị hủy khi xin mã mới.
        authTokenRepository.revokeAllActive(user.getId(), TokenPurpose.PASSWORD_RESET, now);
        failedAttempts.remove(user.getId());

        String otp = "%06d".formatted(RANDOM.nextInt(1_000_000));
        AuthToken token = new AuthToken();
        token.setUser(user);
        token.setTokenHash(hash(user.getId(), otp));
        token.setPurpose(TokenPurpose.PASSWORD_RESET);
        token.setCreatedAt(now);
        token.setExpiresAt(now.plusMinutes(otpProperties.ttlMinutes()));
        authTokenRepository.save(token);

        try {
            mailService.sendPasswordResetOtp(user.getEmail(), user.getFullName(), otp, otpProperties.ttlMinutes());
        } catch (RuntimeException e) {
            // Vẫn trả về bình thường để không lộ email nào tồn tại; người dùng có thể xin lại sau.
            log.error("Could not send password reset mail to user {}", user.getId(), e);
        }
    }

    @Override
    // Không rollback khi ném ApiException, để việc hủy mã sau nhiều lần nhập sai vẫn được lưu.
    @Transactional(noRollbackFor = ApiException.class)
    public void resetPassword(String email, String otp, String newPassword) {
        PasswordPolicy.assertFitsBcrypt(newPassword);
        LocalDateTime now = now();
        User user = userRepository.findByEmail(normalize(email)).orElseThrow(this::invalidOtp);
        if (!Boolean.TRUE.equals(user.getActive())) {
            throw invalidOtp();
        }

        AuthToken token = authTokenRepository
                .findByTokenHashAndPurpose(hash(user.getId(), otp), TokenPurpose.PASSWORD_RESET)
                .filter(found -> found.isUsable(now))
                .orElse(null);
        if (token == null) {
            registerFailure(user.getId(), now);
            throw invalidOtp();
        }

        token.setConsumedAt(now);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setUpdatedAt(now);
        failedAttempts.remove(user.getId());
        // Đổi mật khẩu xong thì mọi phiên cũ phải đăng nhập lại và không còn mã nào dùng được.
        authTokenRepository.revokeAllActive(user.getId(), TokenPurpose.REFRESH, now);
        authTokenRepository.revokeAllActive(user.getId(), TokenPurpose.PASSWORD_RESET, now);
    }

    private void registerFailure(Long userId, LocalDateTime now) {
        int failures = failedAttempts.merge(userId, 1, Integer::sum);
        if (failures >= otpProperties.maxAttempts()) {
            authTokenRepository.revokeAllActive(userId, TokenPurpose.PASSWORD_RESET, now);
            failedAttempts.remove(userId);
            log.warn("Password reset code revoked after too many wrong attempts for user {}", userId);
        }
    }

    // Gắn mã với tài khoản và khóa bí mật của máy chủ, để chỉ biết bản băm trong DB thì không dò ngược ra mã.
    private String hash(Long userId, String otp) {
        String secret = jwtProperties.secretBase64() == null ? "" : jwtProperties.secretBase64();
        return TokenHasher.sha256Hex(userId + ":" + otp + ":" + secret);
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private ApiException invalidOtp() {
        return new ApiException(HttpStatus.BAD_REQUEST, "INVALID_OTP", "Mã xác nhận không đúng hoặc đã hết hạn.");
    }
}
