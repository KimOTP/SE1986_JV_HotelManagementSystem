package com.hotel.hms.identity;

import com.hotel.hms.common.exception.BadRequestException;
import com.hotel.hms.common.exception.NotFoundException;
import com.hotel.hms.identity.dto.RoleResponse;
import com.hotel.hms.identity.entity.Permission;
import com.hotel.hms.identity.entity.Role;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.repository.PermissionRepository;
import com.hotel.hms.identity.repository.RoleRepository;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.service.RoleAdminServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RoleAdminTests {

    private final RoleRepository roles = mock(RoleRepository.class);
    private final PermissionRepository permissions = mock(PermissionRepository.class);
    private final RoleAdminServiceImpl service = new RoleAdminServiceImpl(roles, permissions);

    private final List<Permission> all = IntStream.rangeClosed(1, 30)
            .mapToObj(i -> permission("UC-" + "ABCDE".charAt((i - 1) / 6) + ((i - 1) % 6 + 1)))
            .toList();

    private static Permission permission(String code) {
        Permission permission = new Permission();
        permission.setCode(code);
        return permission;
    }

    private static Role role(String code) {
        Role role = new Role();
        role.setCode(code);
        role.setActive(true);
        return role;
    }

    private static AuthUserDetails actor(String roleCode, String... extraPermissions) {
        Role role = role(roleCode);
        for (String code : extraPermissions) {
            role.getPermissions().add(permission(code));
        }
        User user = new User();
        user.setId(1L);
        user.setEmail("actor@example.test");
        user.setActive(true);
        user.setEmailVerified(true);
        user.getRoles().add(role);
        return AuthUserDetails.from(user, null);
    }

    @BeforeEach
    void setUp() {
        when(permissions.count()).thenReturn(30L);
        when(permissions.findByCodeIn(any())).thenAnswer(call -> {
            Collection<String> codes = call.getArgument(0);
            return all.stream().filter(p -> codes.contains(p.getCode())).toList();
        });
    }

    @Test
    void replacesPermissionsOfRole() {
        Role manager = role("MANAGER");
        manager.getPermissions().add(permission("UC-E1"));
        when(roles.findByCode("MANAGER")).thenReturn(Optional.of(manager));

        RoleResponse response = service.updatePermissions(actor("ADMIN"), "MANAGER", List.of("UC-B1", "UC-B2", "UC-B1"));

        assertEquals(Set.of("UC-B1", "UC-B2"), response.permissions());
        assertEquals(2, manager.getPermissions().size());
    }

    @Test
    void rejectsUnknownPermission() {
        when(roles.findByCode("MANAGER")).thenReturn(Optional.of(role("MANAGER")));

        assertThrows(BadRequestException.class,
                () -> service.updatePermissions(actor("ADMIN"), "MANAGER", List.of("UC-B1", "UC-Z9")));
    }

    @Test
    void rejectsUnknownRole() {
        when(roles.findByCode("GUEST")).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> service.updatePermissions(actor("ADMIN"), "GUEST", List.of()));
    }

    @Test
    void adminAlwaysKeepsAllPermissions() {
        Role admin = role("ADMIN");
        when(roles.findByCode("ADMIN")).thenReturn(Optional.of(admin));
        List<String> allButOne = all.stream().map(Permission::getCode).filter(c -> !c.equals("UC-A6")).toList();

        BadRequestException error = assertThrows(BadRequestException.class,
                () -> service.updatePermissions(actor("ADMIN"), "ADMIN", allButOne));
        assertEquals("ADMIN_PERMISSIONS_LOCKED", error.getCode());

        RoleResponse response = service.updatePermissions(actor("ADMIN"), "ADMIN",
                all.stream().map(Permission::getCode).toList());
        assertEquals(30, response.permissions().size());
    }

    @Test
    void nonAdminCannotRemoveRoleManagementFromOwnRole() {
        Role manager = role("MANAGER");
        when(roles.findByCode("MANAGER")).thenReturn(Optional.of(manager));
        AuthUserDetails managerWithA6 = actor("MANAGER", "UC-A6");

        BadRequestException error = assertThrows(BadRequestException.class,
                () -> service.updatePermissions(managerWithA6, "MANAGER", List.of("UC-E1")));
        assertEquals("CANNOT_REMOVE_OWN_ACCESS", error.getCode());

        service.updatePermissions(managerWithA6, "MANAGER", List.of("UC-E1", "UC-A6"));
        assertEquals(2, manager.getPermissions().size());
    }
}
