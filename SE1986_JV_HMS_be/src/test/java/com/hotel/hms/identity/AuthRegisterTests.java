package com.hotel.hms.identity;

import com.hotel.hms.common.exception.BadRequestException;
import com.hotel.hms.common.exception.ConflictException;
import com.hotel.hms.identity.dto.RegisterRequest;
import com.hotel.hms.identity.dto.UserResponse;
import com.hotel.hms.identity.entity.Permission;
import com.hotel.hms.identity.entity.Role;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.repository.AuthTokenRepository;
import com.hotel.hms.identity.repository.RoleRepository;
import com.hotel.hms.identity.repository.UserRepository;
import com.hotel.hms.identity.security.AuthUserDetailsService;
import com.hotel.hms.identity.security.JwtService;
import com.hotel.hms.identity.service.AuthServiceImpl;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthRegisterTests {

    private final UserRepository users = mock(UserRepository.class);
    private final RoleRepository roles = mock(RoleRepository.class);
    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private AuthServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AuthServiceImpl(
                mock(AuthenticationManager.class),
                mock(AuthUserDetailsService.class),
                mock(JwtService.class),
                users,
                roles,
                encoder,
                mock(AuthTokenRepository.class));

        Permission permission = new Permission();
        permission.setCode("UC-C1");
        Role customer = new Role();
        customer.setCode("CUSTOMER");
        customer.setActive(true);
        customer.getPermissions().add(permission);
        when(roles.findByCodeAndActiveTrue("CUSTOMER")).thenReturn(Optional.of(customer));
    }

    @Test
    void createsActiveVerifiedCustomerWithHashedPassword() {
        UserResponse response = service.register(new RegisterRequest("Nguyễn An", "An@Example.COM", "secret1"));

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(users).saveAndFlush(saved.capture());
        User user = saved.getValue();
        assertEquals("an@example.com", user.getEmail());
        assertTrue(user.getEmailVerified());
        assertTrue(user.getActive());
        assertNotEquals("secret1", user.getPasswordHash());
        assertTrue(encoder.matches("secret1", user.getPasswordHash()));

        assertEquals("CUSTOMER", response.role());
        assertTrue(response.permissions().contains("UC-C1"));
    }

    @Test
    void rejectsEmailThatAlreadyExists() {
        when(users.existsByEmail("an@example.com")).thenReturn(true);

        assertThrows(ConflictException.class,
                () -> service.register(new RegisterRequest("Nguyễn An", "an@example.com", "secret1")));
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void turnsConcurrentDuplicateIntoConflict() {
        when(users.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("duplicate"));

        assertThrows(ConflictException.class,
                () -> service.register(new RegisterRequest("Nguyễn An", "an@example.com", "secret1")));
    }

    @Test
    void rejectsPasswordOverBcryptByteLimit() {
        // 30 ký tự "ệ" = 90 byte: qua được kiểm tra độ dài ký tự nhưng vượt giới hạn của BCrypt.
        String password = "ệ".repeat(30);

        assertThrows(BadRequestException.class,
                () -> service.register(new RegisterRequest("Nguyễn An", "an@example.com", password)));
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void validatesInputAfterTrimming() {
        assertTrue(validator.validate(new RegisterRequest("  Nguyễn An ", " an@example.com ", "secret1")).isEmpty());
        assertFalse(validator.validate(new RegisterRequest("  a  ", "an@example.com", "secret1")).isEmpty());
        assertFalse(validator.validate(new RegisterRequest("Nguyễn An", "not-an-email", "secret1")).isEmpty());
        assertFalse(validator.validate(new RegisterRequest("Nguyễn An", "an@example.com", "12345")).isEmpty());
        assertFalse(validator.validate(new RegisterRequest(null, null, null)).isEmpty());
    }
}
