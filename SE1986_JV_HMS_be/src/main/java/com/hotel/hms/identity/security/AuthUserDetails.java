package com.hotel.hms.identity.security;

import com.hotel.hms.identity.entity.Permission;
import com.hotel.hms.identity.entity.Role;
import com.hotel.hms.identity.entity.Staff;
import com.hotel.hms.identity.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Stream;

/**
 * Người dùng đang đăng nhập. Username là email (các module khác đọc qua Principal#getName).
 * Authorities gồm "ROLE_<code>" và các mã UC, dùng được với
 * {@code @PreAuthorize("hasAuthority('UC-E5')")} hoặc {@code hasRole('MANAGER')}.
 */
@Getter
public class AuthUserDetails implements UserDetails {

    // Thứ tự ưu tiên khi chọn vai trò chính để FE hiển thị.
    public static final List<String> ROLE_PRIORITY = List.of("ADMIN", "MANAGER", "RECEPTIONIST", "HOUSEKEEPER", "CUSTOMER");

    private final Long id;
    private final String email;
    private final String fullName;
    private final String phone;
    private final String passwordHash;
    private final boolean active;
    private final boolean emailVerified;
    private final Set<String> roles;
    private final Set<String> permissions;
    private final String jobTitle;
    private final Long hotelId;
    private final List<GrantedAuthority> authorities;

    private AuthUserDetails(User user, Set<String> roles, Set<String> permissions, Staff staff) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.phone = user.getPhone();
        this.passwordHash = user.getPasswordHash();
        this.active = Boolean.TRUE.equals(user.getActive());
        this.emailVerified = Boolean.TRUE.equals(user.getEmailVerified());
        this.roles = roles;
        this.permissions = permissions;
        this.jobTitle = staff == null ? null : staff.getJobTitle();
        this.hotelId = staff == null ? null : staff.getHotelId();
        this.authorities = Stream.concat(
                        roles.stream().map(role -> "ROLE_" + role),
                        permissions.stream())
                .<GrantedAuthority>map(SimpleGrantedAuthority::new)
                .toList();
    }

    /** Cần gọi trong transaction vì đọc role/permission lazy. */
    public static AuthUserDetails from(User user, Staff staff) {
        Set<String> roles = new TreeSet<>();
        Set<String> permissions = new TreeSet<>();
        for (Role role : user.getRoles()) {
            if (!Boolean.TRUE.equals(role.getActive())) {
                continue;
            }
            roles.add(role.getCode());
            role.getPermissions().stream().map(Permission::getCode).forEach(permissions::add);
        }
        return new AuthUserDetails(user, Collections.unmodifiableSet(roles), Collections.unmodifiableSet(permissions), staff);
    }

    public String getPrimaryRole() {
        return primaryRole(roles);
    }

    public static String primaryRole(Set<String> roles) {
        return ROLE_PRIORITY.stream().filter(roles::contains).findFirst()
                .orElse(roles.stream().findFirst().orElse(null));
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return passwordHash;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}
