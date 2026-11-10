package com.hotel.hms.identity.service;

import com.hotel.hms.common.exception.ApiException;
import com.hotel.hms.common.exception.BadRequestException;
import com.hotel.hms.common.exception.ConflictException;
import com.hotel.hms.common.exception.NotFoundException;
import com.hotel.hms.identity.dto.AdminUserResponse;
import com.hotel.hms.identity.dto.CreateInternalUserRequest;
import com.hotel.hms.identity.dto.ResetPasswordResponse;
import com.hotel.hms.identity.dto.UpdateInternalUserRequest;
import com.hotel.hms.identity.entity.Role;
import com.hotel.hms.identity.entity.Staff;
import com.hotel.hms.identity.entity.TokenPurpose;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.repository.AuthTokenRepository;
import com.hotel.hms.identity.repository.RoleRepository;
import com.hotel.hms.identity.repository.StaffRepository;
import com.hotel.hms.identity.repository.UserRepository;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.security.PasswordPolicy;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserAdminServiceImpl implements UserAdminService {

    private static final String ADMIN_ROLE = "ADMIN";
    private static final Set<String> INTERNAL_ROLES = Set.of("MANAGER", "RECEPTIONIST", "HOUSEKEEPER");

    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final AuthTokenRepository authTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers() {
        // Lấy cả staff đã khóa để tài khoản bị khóa vẫn hiện đúng chức danh.
        Map<Long, String> jobTitles = new HashMap<>();
        staffRepository.findAllWithUser().forEach(staff -> jobTitles.put(staff.getUser().getId(), staff.getJobTitle()));
        return userRepository.findAllByOrderByIdAsc().stream()
                .map(user -> toResponse(user, jobTitles.get(user.getId())))
                .toList();
    }

    @Override
    @Transactional
    public AdminUserResponse createInternalUser(AuthUserDetails actor, CreateInternalUserRequest request) {
        PasswordPolicy.assertFitsBcrypt(request.password());
        String email = request.email().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmail(email)) {
            throw emailTaken();
        }
        Role role = activeRole(request.role());
        Long hotelId = resolveHotelId(actor);

        User user = new User();
        user.setFullName(request.fullName());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setEmailVerified(true);
        user.setActive(true);
        user.getRoles().add(role);
        saveAndCheckEmail(user);

        Staff staff = newStaff(user, hotelId, request.role(), request.jobTitle());
        staffRepository.save(staff);
        return toResponse(user, staff.getJobTitle());
    }

    @Override
    @Transactional
    public AdminUserResponse updateInternalUser(AuthUserDetails actor, Long userId, UpdateInternalUserRequest request) {
        User target = requireInternalUser(userId);
        String currentRole = internalRoleOf(target);
        if (actor.getId().equals(userId) && !currentRole.equals(request.role())) {
            throw new BadRequestException("CANNOT_CHANGE_OWN_ROLE", "Bạn không thể tự thay đổi vai trò của mình.");
        }
        String email = request.email().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailAndIdNot(email, userId)) {
            throw emailTaken();
        }

        target.setFullName(request.fullName());
        target.setEmail(email);
        target.setUpdatedAt(now());
        if (!currentRole.equals(request.role())) {
            target.getRoles().removeIf(role -> INTERNAL_ROLES.contains(role.getCode()));
            target.getRoles().add(activeRole(request.role()));
        }
        saveAndCheckEmail(target);

        Staff staff = staffRepository.findByUser_Id(userId)
                .orElseGet(() -> newStaff(target, resolveHotelId(actor), request.role(), null));
        staff.setJobTitle(titleFor(request.role(), request.jobTitle()));
        staffRepository.save(staff);
        return toResponse(target, staff.getJobTitle());
    }

    @Override
    @Transactional
    public AdminUserResponse setStatus(AuthUserDetails actor, Long userId, boolean enabled) {
        if (actor.getId().equals(userId)) {
            throw new BadRequestException("CANNOT_CHANGE_OWN_STATUS", "Bạn không thể tự vô hiệu hóa tài khoản của mình.");
        }
        User target = requireInternalUser(userId);
        LocalDateTime now = now();
        target.setActive(enabled);
        target.setUpdatedAt(now);

        // Khóa cả staff để người này không còn trong danh sách phân công công việc.
        Staff staff = staffRepository.findByUser_Id(userId).orElse(null);
        if (staff != null) {
            staff.setActive(enabled);
        }
        if (!enabled) {
            authTokenRepository.revokeAllActive(userId, TokenPurpose.REFRESH, now);
        }
        return toResponse(target, staff == null ? null : staff.getJobTitle());
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

        LocalDateTime now = now();
        String temporaryPassword = PasswordPolicy.generateTemporary();
        target.setPasswordHash(passwordEncoder.encode(temporaryPassword));
        target.setUpdatedAt(now);
        authTokenRepository.revokeAllActive(target.getId(), TokenPurpose.REFRESH, now);
        return new ResetPasswordResponse(temporaryPassword);
    }

    private User requireInternalUser(Long userId) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy tài khoản."));
        internalRoleOf(target);
        return target;
    }

    // UC-A5 chỉ quản lý tài khoản nội bộ; ADMIN và khách hàng không sửa hay khóa ở đây.
    private String internalRoleOf(User user) {
        Set<String> roles = user.getRoles().stream().map(Role::getCode).collect(Collectors.toSet());
        if (roles.contains(ADMIN_ROLE)) {
            throw notInternal();
        }
        return roles.stream().filter(INTERNAL_ROLES::contains).sorted().findFirst().orElseThrow(this::notInternal);
    }

    private Role activeRole(String code) {
        return roleRepository.findByCodeAndActiveTrue(code)
                .orElseThrow(() -> new BadRequestException("ROLE_INACTIVE", "Vai trò không khả dụng."));
    }

    // Admin seed không có dòng staff nên lấy khách sạn duy nhất đang hoạt động; không tự đoán khi có nhiều.
    private Long resolveHotelId(AuthUserDetails actor) {
        if (actor.getHotelId() != null) {
            return actor.getHotelId();
        }
        List<Long> hotels = staffRepository.findActiveHotelIds();
        if (hotels.size() != 1) {
            throw new ConflictException("HOTEL_NOT_RESOLVED", "Không xác định được khách sạn cho tài khoản này.");
        }
        return hotels.getFirst();
    }

    private Staff newStaff(User user, Long hotelId, String role, String jobTitle) {
        Staff staff = new Staff();
        staff.setUser(user);
        staff.setHotelId(hotelId);
        // Mã theo user_id nên không trùng; seed có M001, R001, H001.
        staff.setEmployeeCode(String.format("%s%03d", role.charAt(0), user.getId()));
        staff.setJobTitle(titleFor(role, jobTitle));
        staff.setActive(true);
        return staff;
    }

    private static String titleFor(String role, String jobTitle) {
        if (jobTitle != null) {
            return jobTitle;
        }
        return switch (role) {
            case "RECEPTIONIST" -> "Lễ tân";
            case "HOUSEKEEPER" -> "Buồng phòng";
            default -> "Quản lý";
        };
    }

    private void saveAndCheckEmail(User user) {
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // Hai request cùng email: unique index của database là chốt chặn cuối.
            throw emailTaken();
        }
    }

    private static LocalDateTime now() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    private ConflictException emailTaken() {
        return new ConflictException("EMAIL_TAKEN", "Email này đã được sử dụng.");
    }

    private BadRequestException notInternal() {
        return new BadRequestException("NOT_INTERNAL_USER", "UC-A5 chỉ quản lý tài khoản MANAGER, RECEPTIONIST hoặc HOUSEKEEPER.");
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
