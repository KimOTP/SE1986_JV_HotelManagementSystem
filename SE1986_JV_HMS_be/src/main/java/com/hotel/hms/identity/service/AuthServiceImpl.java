package com.hotel.hms.identity.service;

import com.hotel.hms.common.exception.ApiException;
import com.hotel.hms.common.exception.BadRequestException;
import com.hotel.hms.common.exception.ConflictException;
import com.hotel.hms.common.exception.NotFoundException;
import com.hotel.hms.identity.dto.AuthResponse;
import com.hotel.hms.identity.dto.ChangePasswordRequest;
import com.hotel.hms.identity.dto.LoginRequest;
import com.hotel.hms.identity.dto.RegisterRequest;
import com.hotel.hms.identity.dto.UserResponse;
import com.hotel.hms.identity.entity.AuthToken;
import com.hotel.hms.identity.entity.Role;
import com.hotel.hms.identity.entity.TokenPurpose;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.repository.AuthTokenRepository;
import com.hotel.hms.identity.repository.RoleRepository;
import com.hotel.hms.identity.repository.UserRepository;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.security.AuthUserDetailsService;
import com.hotel.hms.identity.security.JwtService;
import com.hotel.hms.identity.security.PasswordPolicy;
import com.hotel.hms.identity.security.TokenHasher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final String TOKEN_TYPE = "Bearer";
    private static final String CUSTOMER_ROLE = "CUSTOMER";

    private final AuthenticationManager authenticationManager;
    private final AuthUserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthTokenRepository authTokenRepository;

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        PasswordPolicy.assertFitsBcrypt(request.password());
        String email = request.email().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(email)) {
            throw emailTaken();
        }
        Role customerRole = roleRepository.findByCodeAndActiveTrue(CUSTOMER_ROLE)
                .orElseThrow(() -> new IllegalStateException("Role CUSTOMER is missing or inactive"));

        User user = new User();
        user.setFullName(request.fullName());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        // Hệ thống không gửi mail nên coi email là đã xác thực.
        user.setEmailVerified(true);
        user.setActive(true);
        user.getRoles().add(customerRole);
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // Hai request cùng email: unique index của database là chốt chặn cuối.
            throw emailTaken();
        }
        return UserResponse.from(AuthUserDetails.from(user, null));
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        AuthUserDetails user;
        try {
            var authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email().trim(), request.password()));
            user = (AuthUserDetails) authentication.getPrincipal();
        } catch (DisabledException e) {
            // Chỉ tới được đây khi mật khẩu đúng (xem SecurityConfig#authenticationManager).
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", "Tài khoản đã bị vô hiệu hóa.");
        } catch (BadCredentialsException | UsernameNotFoundException e) {
            // Không phân biệt sai email hay sai mật khẩu để tránh dò tài khoản.
            throw invalidCredentials();
        } catch (AuthenticationException e) {
            log.warn("Login failed: {}", e.getClass().getSimpleName());
            throw invalidCredentials();
        }

        if (!user.isEmailVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "EMAIL_NOT_VERIFIED",
                    "Email chưa được xác thực. Vui lòng kiểm tra hộp thư.");
        }
        return issueTokens(user);
    }

    @Override
    // Không rollback khi ném ApiException, để việc thu hồi phiên khi phát hiện token bị dùng lại vẫn được lưu.
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse refresh(String refreshToken) {
        LocalDateTime now = now();
        AuthToken stored = authTokenRepository
                .findByTokenHashAndPurpose(TokenHasher.sha256Hex(refreshToken), TokenPurpose.REFRESH)
                .orElseThrow(this::invalidRefreshToken);

        if (stored.getConsumedAt() != null) {
            // Token đã đổi rồi mà bị dùng lại: có thể đã bị lộ, thu hồi mọi phiên của user.
            authTokenRepository.revokeAllActive(stored.getUser().getId(), TokenPurpose.REFRESH, now);
            log.warn("Refresh token reuse detected for user {}", stored.getUser().getId());
            throw invalidRefreshToken();
        }
        if (!stored.isUsable(now)) {
            throw invalidRefreshToken();
        }
        stored.setConsumedAt(now);

        AuthUserDetails user;
        try {
            user = userDetailsService.loadUserByUsername(stored.getUser().getEmail());
        } catch (UsernameNotFoundException e) {
            throw invalidRefreshToken();
        }
        if (!user.isEnabled()) {
            throw invalidRefreshToken();
        }
        return issueTokens(user);
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        LocalDateTime now = now();
        authTokenRepository.findByTokenHashAndPurpose(TokenHasher.sha256Hex(refreshToken), TokenPurpose.REFRESH)
                .filter(token -> token.isUsable(now))
                .ifPresent(token -> token.setRevokedAt(now));
    }

    @Override
    public UserResponse me(AuthUserDetails currentUser) {
        return UserResponse.from(currentUser);
    }

    @Override
    @Transactional
    public AuthResponse changePassword(AuthUserDetails currentUser, ChangePasswordRequest request) {
        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản."));
        // Trả 400 chứ không phải 401: phiên vẫn hợp lệ, FE không được coi là hết hạn đăng nhập.
        if (user.getPasswordHash() == null
                || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("WRONG_PASSWORD", "Mật khẩu hiện tại không chính xác.");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new BadRequestException("SAME_PASSWORD", "Mật khẩu mới phải khác mật khẩu hiện tại.");
        }
        PasswordPolicy.assertFitsBcrypt(request.newPassword());

        LocalDateTime now = now();
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setUpdatedAt(now);
        authTokenRepository.revokeAllActive(user.getId(), TokenPurpose.REFRESH, now);
        return issueTokens(currentUser);
    }

    private AuthResponse issueTokens(AuthUserDetails user) {
        LocalDateTime now = now();
        String refreshToken = TokenHasher.generate();

        AuthToken token = new AuthToken();
        token.setUser(userRepository.getReferenceById(user.getId()));
        token.setTokenHash(TokenHasher.sha256Hex(refreshToken));
        token.setPurpose(TokenPurpose.REFRESH);
        token.setCreatedAt(now);
        token.setExpiresAt(now.plusSeconds(jwtService.getRefreshTokenTtlSeconds()));
        authTokenRepository.save(token);

        return new AuthResponse(
                jwtService.generateAccessToken(user),
                refreshToken,
                TOKEN_TYPE,
                jwtService.getAccessTokenTtlSeconds(),
                UserResponse.from(user)
        );
    }

    // Cột datetime2 trong DB lưu giờ UTC (sysutcdatetime()).
    private static LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private ConflictException emailTaken() {
        return new ConflictException("EMAIL_TAKEN", "Email này đã được đăng ký.");
    }

    private ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Email hoặc mật khẩu không chính xác.");
    }

    private ApiException invalidRefreshToken() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN",
                "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
}
