package com.hotel.hms.identity.service;

import com.hotel.hms.identity.dto.AuthResponse;
import com.hotel.hms.identity.dto.LoginRequest;
import com.hotel.hms.identity.dto.UserResponse;
import com.hotel.hms.identity.security.AuthUserDetails;

public interface AuthService {

    AuthResponse login(LoginRequest request);

    /** Đổi refresh token cũ lấy cặp token mới; token cũ không dùng lại được. */
    AuthResponse refresh(String refreshToken);

    void logout(String refreshToken);

    UserResponse me(AuthUserDetails currentUser);
}
