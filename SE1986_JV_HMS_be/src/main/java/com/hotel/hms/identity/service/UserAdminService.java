package com.hotel.hms.identity.service;

import com.hotel.hms.identity.dto.AdminUserResponse;
import com.hotel.hms.identity.dto.ResetPasswordResponse;
import com.hotel.hms.identity.security.AuthUserDetails;

import java.util.List;

public interface UserAdminService {

    List<AdminUserResponse> listUsers();

    /** UC-A3: đặt mật khẩu tạm do hệ thống sinh và đăng xuất người dùng khỏi mọi phiên. */
    ResetPasswordResponse resetPassword(AuthUserDetails actor, Long userId);
}
