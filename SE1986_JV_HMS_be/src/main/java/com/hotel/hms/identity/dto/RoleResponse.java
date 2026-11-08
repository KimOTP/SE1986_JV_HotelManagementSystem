package com.hotel.hms.identity.dto;

import java.util.Set;

public record RoleResponse(
        String code,
        String name,
        Set<String> permissions
) {
}
