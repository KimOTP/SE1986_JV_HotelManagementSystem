package com.hotel.hms.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateInternalUserRequest(
        @NotBlank(message = "Vui lòng nhập họ và tên.")
        @Size(min = 2, max = 100, message = "Họ và tên phải có từ 2 đến 100 ký tự.")
        String fullName,

        @NotBlank(message = "Vui lòng nhập email.")
        @Email(message = "Email không hợp lệ.")
        @Size(max = 254, message = "Email không được vượt quá 254 ký tự.")
        String email,

        @NotBlank(message = "Vui lòng chọn vai trò.")
        @Pattern(regexp = "MANAGER|STAFF", message = "UC-A5 chỉ cho phép vai trò MANAGER hoặc STAFF.")
        String role,

        @Size(max = 100, message = "Chức danh không được vượt quá 100 ký tự.")
        String jobTitle,

        @NotBlank(message = "Vui lòng nhập mật khẩu ban đầu.")
        @Size(min = 6, max = 72, message = "Mật khẩu phải có từ 6 đến 72 ký tự.")
        String password
) {
    public CreateInternalUserRequest {
        fullName = fullName == null ? null : fullName.trim();
        email = email == null ? null : email.trim();
        jobTitle = jobTitle == null || jobTitle.isBlank() ? null : jobTitle.trim();
    }
}
