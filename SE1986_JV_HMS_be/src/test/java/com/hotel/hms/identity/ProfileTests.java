package com.hotel.hms.identity;

import com.hotel.hms.common.exception.NotFoundException;
import com.hotel.hms.identity.dto.UpdateProfileRequest;
import com.hotel.hms.identity.dto.UserResponse;
import com.hotel.hms.identity.entity.Role;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.repository.AuthTokenRepository;
import com.hotel.hms.identity.repository.RoleRepository;
import com.hotel.hms.identity.repository.UserRepository;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.security.AuthUserDetailsService;
import com.hotel.hms.identity.security.JwtService;
import com.hotel.hms.identity.service.AuthServiceImpl;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ProfileTests {

    private final UserRepository users = mock(UserRepository.class);
    private final AuthUserDetailsService details = mock(AuthUserDetailsService.class);
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private final AuthServiceImpl auth = new AuthServiceImpl(
            mock(AuthenticationManager.class),
            details,
            mock(JwtService.class),
            users,
            mock(RoleRepository.class),
            new BCryptPasswordEncoder(4),
            mock(AuthTokenRepository.class));

    private User customer() {
        Role role = new Role();
        role.setCode("CUSTOMER");
        role.setActive(true);
        User user = new User();
        user.setId(5L);
        user.setEmail("customer@example.test");
        user.setFullName("Tên Cũ");
        user.setPhone("0900000000");
        user.setActive(true);
        user.setEmailVerified(true);
        user.getRoles().add(role);
        return user;
    }

    @Test
    void updatesNameAndPhoneButNotEmailOrRole() {
        User user = customer();
        when(users.findById(5L)).thenReturn(Optional.of(user));
        when(details.loadUserByUsername("customer@example.test"))
                .thenAnswer(call -> AuthUserDetails.from(user, null));

        UserResponse response = auth.updateProfile(AuthUserDetails.from(user, null),
                new UpdateProfileRequest("  Tên Mới ", " 0912 345 678 "));

        assertEquals("Tên Mới", user.getFullName());
        assertEquals("0912 345 678", user.getPhone());
        assertNotNull(user.getUpdatedAt());
        assertEquals("customer@example.test", user.getEmail());
        assertEquals("Tên Mới", response.fullName());
        assertEquals("CUSTOMER", response.role());
        assertTrue(response.enabled());
    }

    @Test
    void blankPhoneClearsIt() {
        User user = customer();
        when(users.findById(5L)).thenReturn(Optional.of(user));
        when(details.loadUserByUsername("customer@example.test"))
                .thenAnswer(call -> AuthUserDetails.from(user, null));

        auth.updateProfile(AuthUserDetails.from(user, null), new UpdateProfileRequest("Tên Mới", "   "));

        assertNull(user.getPhone());
    }

    @Test
    void unknownUserIsNotFound() {
        User user = customer();
        when(users.findById(5L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> auth.updateProfile(
                AuthUserDetails.from(user, null), new UpdateProfileRequest("Tên Mới", null)));
    }

    @Test
    void validatesNameAndPhone() {
        assertTrue(validator.validate(new UpdateProfileRequest("Tên Mới", null)).isEmpty());
        assertTrue(validator.validate(new UpdateProfileRequest("Tên Mới", "")).isEmpty());
        assertTrue(validator.validate(new UpdateProfileRequest("Tên Mới", "+84 912-345-678")).isEmpty());
        assertFalse(validator.validate(new UpdateProfileRequest(" a ", null)).isEmpty());
        assertFalse(validator.validate(new UpdateProfileRequest("Tên Mới", "abc")).isEmpty());
        assertFalse(validator.validate(new UpdateProfileRequest("Tên Mới", "123")).isEmpty());
        assertFalse(validator.validate(new UpdateProfileRequest("Tên Mới", "0".repeat(21))).isEmpty());
    }
}
