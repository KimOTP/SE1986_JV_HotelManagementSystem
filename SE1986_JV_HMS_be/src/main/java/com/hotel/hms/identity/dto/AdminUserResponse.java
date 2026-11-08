package com.hotel.hms.identity.dto;

import java.util.Set;

/** Một dòng trong màn Quản lý tài khoản; không chứa mật khẩu. */
public record AdminUserResponse(
        Long id,
        String fullName,
        String email,
        String role,
        Set<String> roles,
        String jobTitle,
        boolean enabled
) {
}
