package com.hotel.hms.identity.controller;

import com.hotel.hms.identity.dto.AdminUserResponse;
import com.hotel.hms.identity.dto.CreateInternalUserRequest;
import com.hotel.hms.identity.dto.ResetPasswordResponse;
import com.hotel.hms.identity.dto.UpdateInternalUserRequest;
import com.hotel.hms.identity.dto.UpdateUserStatusRequest;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.service.UserAdminService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AdminUserResponse create(@AuthenticationPrincipal AuthUserDetails actor,
                                    @Valid @RequestBody CreateInternalUserRequest request) {
        return userAdminService.createInternalUser(actor, request);
    }

    @PutMapping("/{id}")
    public AdminUserResponse update(@AuthenticationPrincipal AuthUserDetails actor,
                                    @PathVariable @Positive Long id,
                                    @Valid @RequestBody UpdateInternalUserRequest request) {
        return userAdminService.updateInternalUser(actor, id, request);
    }

    @PatchMapping("/{id}/status")
    public AdminUserResponse setStatus(@AuthenticationPrincipal AuthUserDetails actor,
                                       @PathVariable @Positive Long id,
                                       @Valid @RequestBody UpdateUserStatusRequest request) {
        return userAdminService.setStatus(actor, id, request.enabled());
    }

    // UC-A3
    @PostMapping("/{id}/reset-password")
    public ResetPasswordResponse resetPassword(@AuthenticationPrincipal AuthUserDetails actor,
                                               @PathVariable @Positive Long id) {
        return userAdminService.resetPassword(actor, id);
    }
}
