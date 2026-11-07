package com.hotel.hms.identity.controller;

import com.hotel.hms.identity.dto.AuthResponse;
import com.hotel.hms.identity.dto.ChangePasswordRequest;
import com.hotel.hms.identity.dto.UpdateProfileRequest;
import com.hotel.hms.identity.dto.UserResponse;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Tài khoản của chính người đang đăng nhập (UC-A4). */
@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('UC-A4')")
public class UserAccountController {

    private final AuthService authService;

    @PutMapping("/profile")
    public UserResponse updateProfile(@AuthenticationPrincipal AuthUserDetails currentUser,
                                      @Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(currentUser, request);
    }

    @PutMapping("/password")
    public AuthResponse changePassword(@AuthenticationPrincipal AuthUserDetails currentUser,
                                       @Valid @RequestBody ChangePasswordRequest request) {
        return authService.changePassword(currentUser, request);
    }
}
