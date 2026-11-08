package com.hotel.hms.identity.dto;

/** Mật khẩu tạm chỉ trả về một lần, database chỉ lưu bản băm. */
public record ResetPasswordResponse(String temporaryPassword) {
}
