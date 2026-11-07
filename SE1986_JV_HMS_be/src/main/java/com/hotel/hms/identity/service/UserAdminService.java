package com.hotel.hms.identity.service;

import com.hotel.hms.identity.dto.AdminUserResponse;
import com.hotel.hms.identity.dto.CreateInternalUserRequest;
import com.hotel.hms.identity.dto.ResetPasswordResponse;
import com.hotel.hms.identity.dto.UpdateInternalUserRequest;
import com.hotel.hms.identity.security.AuthUserDetails;

import java.util.List;

public interface UserAdminService {

    List<AdminUserResponse> listUsers();

    /** Tạo tài khoản MANAGER/STAFF: ghi users, user_roles và staff trong một transaction. */
    AdminUserResponse createInternalUser(AuthUserDetails actor, CreateInternalUserRequest request);

    AdminUserResponse updateInternalUser(AuthUserDetails actor, Long userId, UpdateInternalUserRequest request);

    /** Khóa có hiệu lực ngay vì mỗi request đều đọc lại trạng thái tài khoản từ database. */
    AdminUserResponse setStatus(AuthUserDetails actor, Long userId, boolean enabled);

    /** UC-A3: đặt mật khẩu tạm do hệ thống sinh và đăng xuất người dùng khỏi mọi phiên. */
    ResetPasswordResponse resetPassword(AuthUserDetails actor, Long userId);
}
