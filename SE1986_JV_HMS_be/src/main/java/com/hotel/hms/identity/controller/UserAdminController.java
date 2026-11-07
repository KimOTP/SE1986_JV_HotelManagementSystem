package com.hotel.hms.identity.controller;

import com.hotel.hms.identity.dto.AdminUserResponse;
import com.hotel.hms.identity.dto.ResetPasswordResponse;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.service.UserAdminService;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('UC-A5')")
public class UserAdminController {

    private final UserAdminService userAdminService;

    @GetMapping
    public List<AdminUserResponse> list() {
        return userAdminService.listUsers();
    }

    // UC-A3
    @PostMapping("/{id}/reset-password")
    public ResetPasswordResponse resetPassword(@AuthenticationPrincipal AuthUserDetails actor,
                                               @PathVariable @Positive Long id) {
        return userAdminService.resetPassword(actor, id);
    }
}
