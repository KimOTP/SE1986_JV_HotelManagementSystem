package com.hotel.hms.identity;

import com.hotel.hms.common.exception.ApiException;
import com.hotel.hms.common.exception.BadRequestException;
import com.hotel.hms.common.exception.NotFoundException;
import com.hotel.hms.identity.dto.ChangePasswordRequest;
import com.hotel.hms.identity.dto.ResetPasswordResponse;
import com.hotel.hms.identity.entity.Role;
import com.hotel.hms.identity.entity.TokenPurpose;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.repository.AuthTokenRepository;
import com.hotel.hms.identity.repository.RoleRepository;
import com.hotel.hms.identity.repository.StaffRepository;
import com.hotel.hms.identity.repository.UserRepository;
import com.hotel.hms.identity.security.AuthUserDetails;
import com.hotel.hms.identity.security.AuthUserDetailsService;
import com.hotel.hms.identity.security.JwtService;
import com.hotel.hms.identity.service.AuthServiceImpl;
import com.hotel.hms.identity.service.UserAdminServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PasswordManagementTests {

    private final UserRepository users = mock(UserRepository.class);
    private final AuthTokenRepository tokens = mock(AuthTokenRepository.class);
    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);

    private final UserAdminServiceImpl admin =
            new UserAdminServiceImpl(users, mock(StaffRepository.class), tokens, encoder);
    private final AuthServiceImpl auth = new AuthServiceImpl(
            mock(AuthenticationManager.class),
            mock(AuthUserDetailsService.class),
            mock(JwtService.class),
            users,
            mock(RoleRepository.class),
            encoder,
            tokens);

    private User user(long id, String roleCode, String password) {
        Role role = new Role();
        role.setCode(roleCode);
        role.setActive(true);
        User user = new User();
        user.setId(id);
        user.setEmail(roleCode.toLowerCase() + "@example.test");
        user.setFullName(roleCode);
        user.setActive(true);
        user.setEmailVerified(true);
        user.setPasswordHash(encoder.encode(password));
        user.getRoles().add(role);
        return user;
    }

    private AuthUserDetails actor(long id, String roleCode) {
        return AuthUserDetails.from(user(id, roleCode, "actor-password"), null);
    }

    @Test
    void adminResetSetsNewHashAndRevokesSessions() {
        User target = user(5, "CUSTOMER", "old-password");
        when(users.findById(5L)).thenReturn(Optional.of(target));

        ResetPasswordResponse response = admin.resetPassword(actor(1, "ADMIN"), 5L);

        assertEquals(12, response.temporaryPassword().length());
        assertTrue(encoder.matches(response.temporaryPassword(), target.getPasswordHash()));
        assertFalse(encoder.matches("old-password", target.getPasswordHash()));
        verify(tokens).revokeAllActive(eq(5L), eq(TokenPurpose.REFRESH), any());
    }

    @Test
    void cannotResetOwnPassword() {
        assertThrows(BadRequestException.class, () -> admin.resetPassword(actor(1, "ADMIN"), 1L));
        verifyNoInteractions(tokens);
    }

    @Test
    void nonAdminCannotResetAdminPassword() {
        User target = user(1, "ADMIN", "old-password");
        String oldHash = target.getPasswordHash();
        when(users.findById(1L)).thenReturn(Optional.of(target));

        ApiException error = assertThrows(ApiException.class,
                () -> admin.resetPassword(actor(2, "MANAGER"), 1L));

        assertEquals(HttpStatus.FORBIDDEN, error.getStatus());
        assertEquals(oldHash, target.getPasswordHash());
        verifyNoInteractions(tokens);
    }

    @Test
    void resetOfUnknownUserIsNotFound() {
        when(users.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> admin.resetPassword(actor(1, "ADMIN"), 99L));
    }

    @Test
    void changePasswordChecksCurrentThenRevokesOldSessions() {
        User target = user(5, "CUSTOMER", "old-password");
        when(users.findById(5L)).thenReturn(Optional.of(target));
        when(users.getReferenceById(5L)).thenReturn(target);

        auth.changePassword(AuthUserDetails.from(target, null), new ChangePasswordRequest("old-password", "new-password"));

        assertTrue(encoder.matches("new-password", target.getPasswordHash()));
        verify(tokens).revokeAllActive(eq(5L), eq(TokenPurpose.REFRESH), any());
        verify(tokens).save(any());
    }

    @Test
    void changePasswordRejectsWrongCurrentPassword() {
        User target = user(5, "CUSTOMER", "old-password");
        String oldHash = target.getPasswordHash();
        when(users.findById(5L)).thenReturn(Optional.of(target));

        BadRequestException error = assertThrows(BadRequestException.class,
                () -> auth.changePassword(AuthUserDetails.from(target, null), new ChangePasswordRequest("wrong", "new-password")));

        assertEquals("WRONG_PASSWORD", error.getCode());
        assertEquals(oldHash, target.getPasswordHash());
        verify(tokens, never()).revokeAllActive(any(), any(), any());
    }

    @Test
    void changePasswordRejectsSamePassword() {
        User target = user(5, "CUSTOMER", "old-password");
        when(users.findById(5L)).thenReturn(Optional.of(target));

        BadRequestException error = assertThrows(BadRequestException.class,
                () -> auth.changePassword(AuthUserDetails.from(target, null), new ChangePasswordRequest("old-password", "old-password")));

        assertEquals("SAME_PASSWORD", error.getCode());
    }
}
