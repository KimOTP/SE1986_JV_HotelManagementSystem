package com.hotel.hms.identity.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record UpdateRolePermissionsRequest(
        @NotNull(message = "Thiếu danh sách quyền.")
        List<String> permissions
) {
}
