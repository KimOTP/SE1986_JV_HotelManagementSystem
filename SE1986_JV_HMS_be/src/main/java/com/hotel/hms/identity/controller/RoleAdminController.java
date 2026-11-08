package com.hotel.hms.identity.controller;

import com.hotel.hms.identity.dto.RoleResponse;
import com.hotel.hms.identity.dto.UpdateRolePermissionsRequest;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.service.RoleAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// UC-A6
@RestController
@RequestMapping("/api/admin/roles")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('UC-A6')")
public class RoleAdminController {

    private final RoleAdminService roleAdminService;

    @GetMapping
    public List<RoleResponse> list() {
        return roleAdminService.listRoles();
    }

    @PutMapping("/{code}/permissions")
    public RoleResponse updatePermissions(@AuthenticationPrincipal AuthUserDetails actor,
                                          @PathVariable String code,
                                          @Valid @RequestBody UpdateRolePermissionsRequest request) {
        return roleAdminService.updatePermissions(actor, code, request.permissions());
    }
}
