package com.hotel.hms.identity.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateUserStatusRequest(
        @NotNull(message = "Thiếu trạng thái tài khoản.")
        Boolean enabled
) {
}
