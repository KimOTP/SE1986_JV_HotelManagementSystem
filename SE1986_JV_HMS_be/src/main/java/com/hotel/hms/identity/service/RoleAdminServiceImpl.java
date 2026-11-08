package com.hotel.hms.identity.service;

import com.hotel.hms.common.exception.BadRequestException;
import com.hotel.hms.common.exception.NotFoundException;
import com.hotel.hms.identity.dto.RoleResponse;
import com.hotel.hms.identity.entity.Permission;
import com.hotel.hms.identity.entity.Role;
import com.hotel.hms.identity.repository.PermissionRepository;
import com.hotel.hms.identity.repository.RoleRepository;
import com.hotel.hms.identity.security.AuthUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleAdminServiceImpl implements RoleAdminService {

    private static final String ADMIN_ROLE = "ADMIN";
    private static final String ROLE_MANAGE_PERMISSION = "UC-A6";

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Override
    @Transactional(readOnly = true)
    public List<RoleResponse> listRoles() {
        return roleRepository.findAllByOrderByIdAsc().stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public RoleResponse updatePermissions(AuthUserDetails actor, String roleCode, List<String> permissionCodes) {
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy vai trò."));
        Set<String> requested = new LinkedHashSet<>(permissionCodes);
        List<Permission> permissions = permissionRepository.findByCodeIn(requested);
        if (permissions.size() != requested.size()) {
            throw new BadRequestException("UNKNOWN_PERMISSION", "Danh sách chứa quyền không tồn tại.");
        }

        // ADMIN luôn giữ đủ quyền để hệ thống không mất người quản trị.
        if (ADMIN_ROLE.equals(role.getCode()) && requested.size() != permissionRepository.count()) {
            throw new BadRequestException("ADMIN_PERMISSIONS_LOCKED", "Không thể bớt quyền của ADMIN.");
        }
        // Người không phải ADMIN được cấp UC-A6 không được tự gỡ quyền này khỏi role của mình.
        boolean actorHoldsRole = actor.getRoles().contains(role.getCode());
        if (actorHoldsRole && !actor.getRoles().contains(ADMIN_ROLE) && !requested.contains(ROLE_MANAGE_PERMISSION)) {
            throw new BadRequestException("CANNOT_REMOVE_OWN_ACCESS",
                    "Bạn không thể tự gỡ quyền quản lý vai trò khỏi vai trò của mình.");
        }

        role.setPermissions(new HashSet<>(permissions));
        return toResponse(role);
    }

    private RoleResponse toResponse(Role role) {
        return new RoleResponse(
                role.getCode(),
                role.getName(),
                role.getPermissions().stream().map(Permission::getCode).collect(Collectors.toCollection(TreeSet::new))
        );
    }
}
