package com.hotel.hms.identity.service;

import com.hotel.hms.common.exception.ApiException;
import com.hotel.hms.common.exception.BadRequestException;
import com.hotel.hms.common.exception.NotFoundException;
import com.hotel.hms.identity.dto.AdminUserResponse;
import com.hotel.hms.identity.dto.ResetPasswordResponse;
import com.hotel.hms.identity.entity.Role;
import com.hotel.hms.identity.entity.Staff;
import com.hotel.hms.identity.entity.TokenPurpose;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.repository.AuthTokenRepository;
import com.hotel.hms.identity.repository.StaffRepository;
import com.hotel.hms.identity.repository.UserRepository;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.security.PasswordPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserAdminServiceImpl implements UserAdminService {

    private static final String ADMIN_ROLE = "ADMIN";

    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final AuthTokenRepository authTokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers() {
        Map<Long, String> jobTitles = staffRepository.findAllWithUser().stream()
                .filter(staff -> staff.getJobTitle() != null)
                .collect(Collectors.toMap(staff -> staff.getUser().getId(), Staff::getJobTitle));
        return userRepository.findAllByOrderByIdAsc().stream()
                .map(user -> toResponse(user, jobTitles.get(user.getId())))
                .toList();
    }

    @Override
    @Transactional
    public ResetPasswordResponse resetPassword(AuthUserDetails actor, Long userId) {
        if (actor.getId().equals(userId)) {
            throw new BadRequestException("CANNOT_RESET_SELF", "Hãy đổi mật khẩu của bạn trong trang Hồ sơ.");
        }
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản."));
        // UC-A5 có thể được cấp cho role khác: không để người đó chiếm tài khoản ADMIN.
        boolean targetIsAdmin = target.getRoles().stream().anyMatch(role -> ADMIN_ROLE.equals(role.getCode()));
        if (targetIsAdmin && !actor.getRoles().contains(ADMIN_ROLE)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCESS_DENIED", "Bạn không thể đặt lại mật khẩu của quản trị viên.");
        }

        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        String temporaryPassword = PasswordPolicy.generateTemporary();
        target.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        target.setUpdatedAt(now);
        authTokenRepository.revokeAllActive(target.getId(), TokenPurpose.REFRESH, now);
        return new ResetPasswordResponse(temporaryPassword);
    }

    private AdminUserResponse toResponse(User user, String jobTitle) {
        Set<String> roles = user.getRoles().stream()
                .map(Role::getCode)
                .collect(Collectors.toCollection(TreeSet::new));
        return new AdminUserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                AuthUserDetails.primaryRole(roles),
                roles,
                jobTitle,
                Boolean.TRUE.equals(user.getActive())
        );
    }
}
