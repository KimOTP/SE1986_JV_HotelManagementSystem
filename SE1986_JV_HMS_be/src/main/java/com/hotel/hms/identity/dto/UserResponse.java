package com.hotel.hms.identity.dto;

import com.hotel.hms.identity.security.AuthUserDetails;

import java.util.Set;

/** Thông tin user trả cho FE; {@code role} là vai trò chính, {@code permissions} là các mã UC. */
public record UserResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        String role,
        Set<String> roles,
        Set<String> permissions,
        String jobTitle,
        Long hotelId,
        boolean emailVerified,
        boolean enabled
) {
    public static UserResponse from(AuthUserDetails user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getPrimaryRole(),
                user.getRoles(),
                user.getPermissions(),
                user.getJobTitle(),
                user.getHotelId(),
                user.isEmailVerified(),
                user.isEnabled()
        );
    }
}
