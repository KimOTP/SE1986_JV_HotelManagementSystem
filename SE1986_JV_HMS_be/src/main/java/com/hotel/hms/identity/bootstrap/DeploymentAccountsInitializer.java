package com.hotel.hms.identity.bootstrap;

import com.hotel.hms.identity.entity.TokenPurpose;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.repository.AuthTokenRepository;
import com.hotel.hms.identity.repository.UserRepository;
import com.hotel.hms.identity.security.PasswordPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;

/**
 * Khi deploy: nếu đặt ADMIN_BOOTSTRAP_PASSWORD thì gán mật khẩu đó cho tài khoản admin có sẵn
 * (mặc định admin@sba.example). Để trống thì không làm gì, nên chạy local không bị ảnh hưởng.
 */
@Component
public class DeploymentAccountsInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DeploymentAccountsInitializer.class);
    private static final int MIN_PASSWORD_LENGTH = 8;

    private final UserRepository users;
    private final AuthTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final String adminEmail;
    private final String adminPassword;

    public DeploymentAccountsInitializer(UserRepository users, AuthTokenRepository tokens,
                                         PasswordEncoder encoder,
                                         @Value("${app.bootstrap.admin-email:admin@sba.example}") String adminEmail,
                                         @Value("${app.bootstrap.admin-password:}") String adminPassword) {
        this.users = users;
        this.tokens = tokens;
        this.encoder = encoder;
        this.adminEmail = adminEmail.trim().toLowerCase(Locale.ROOT);
        this.adminPassword = adminPassword;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!adminPassword.isBlank()) {
            applyAdminPassword(LocalDateTime.now(ZoneOffset.UTC));
        }
    }

    private void applyAdminPassword(LocalDateTime now) {
        if (adminPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalStateException("ADMIN_BOOTSTRAP_PASSWORD phải có ít nhất " + MIN_PASSWORD_LENGTH + " ký tự.");
        }
        PasswordPolicy.assertFitsBcrypt(adminPassword);
        User admin = users.findByEmail(adminEmail).orElse(null);
        if (admin == null) {
            log.warn("ADMIN_BOOTSTRAP_PASSWORD được đặt nhưng không có tài khoản {}.", adminEmail);
            return;
        }
        // Chỉ ghi lại khi khác để khởi động lại không đổi mật khẩu hay thu hồi phiên vô cớ.
        if (!Boolean.TRUE.equals(admin.getActive()) || !encoder.matches(adminPassword, admin.getPasswordHash())) {
            admin.setPasswordHash(encoder.encode(adminPassword));
            admin.setActive(true);
            admin.setUpdatedAt(now);
            tokens.revokeAllActive(admin.getId(), TokenPurpose.REFRESH, now);
            log.info("Đã đặt mật khẩu cho tài khoản quản trị {}.", adminEmail);
        }
    }
}
