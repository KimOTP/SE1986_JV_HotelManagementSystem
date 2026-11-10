package com.hotel.hms.identity.controller;

import com.hotel.hms.identity.dto.AuthResponse;
import com.hotel.hms.identity.dto.ForgotPasswordRequest;
import com.hotel.hms.identity.dto.LoginRequest;
import com.hotel.hms.identity.dto.RefreshTokenRequest;
import com.hotel.hms.identity.dto.RegisterRequest;
import com.hotel.hms.identity.dto.ResetPasswordWithOtpRequest;
import com.hotel.hms.identity.dto.UserResponse;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.service.AuthService;
import com.hotel.hms.identity.service.PasswordResetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;

    // UC-A1
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    // UC-A2
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    // UC-A3: xin mã OTP qua email, rồi đặt mật khẩu mới bằng mã đó.
    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        // Cùng một câu trả lời dù email có tồn tại hay không.
        return Map.of("message", "Nếu email đã đăng ký, mã xác nhận đã được gửi. Vui lòng kiểm tra hộp thư.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(@Valid @RequestBody ResetPasswordWithOtpRequest request) {
        passwordResetService.resetPassword(request.email(), request.otp(), request.newPassword());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return authService.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal AuthUserDetails currentUser) {
        return authService.me(currentUser);
    }
}
