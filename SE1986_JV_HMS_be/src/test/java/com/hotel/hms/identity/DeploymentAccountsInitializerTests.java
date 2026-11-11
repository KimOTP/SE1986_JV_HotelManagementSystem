package com.hotel.hms.identity;

import com.hotel.hms.identity.bootstrap.DeploymentAccountsInitializer;
import com.hotel.hms.identity.entity.TokenPurpose;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.repository.AuthTokenRepository;
import com.hotel.hms.identity.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class DeploymentAccountsInitializerTests {

    private final UserRepository users = mock(UserRepository.class);
    private final AuthTokenRepository tokens = mock(AuthTokenRepository.class);
    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);

    private DeploymentAccountsInitializer initializer(String password) {
        return new DeploymentAccountsInitializer(users, tokens, encoder, "Admin@Sba.Example", password);
    }

    private User admin() {
        User admin = new User();
        admin.setId(1L);
        admin.setEmail("admin@sba.example");
        admin.setPasswordHash(encoder.encode("old-password"));
        admin.setActive(true);
        return admin;
    }

    @Test
    void blankPasswordDoesNothing() {
        initializer("").run(null);

        verifyNoInteractions(users, tokens);
    }

    @Test
    void setsAdminPasswordAndRevokesSessions() {
        User admin = admin();
        when(users.findByEmail("admin@sba.example")).thenReturn(Optional.of(admin));

        initializer("new-password-1").run(null);

        assertTrue(encoder.matches("new-password-1", admin.getPasswordHash()));
        verify(tokens).revokeAllActive(eq(1L), eq(TokenPurpose.REFRESH), any());
    }

    @Test
    void samePasswordOnRestartChangesNothing() {
        User admin = admin();
        String before = admin.getPasswordHash();
        when(users.findByEmail("admin@sba.example")).thenReturn(Optional.of(admin));

        initializer("old-password").run(null);

        assertEquals(before, admin.getPasswordHash());
        verifyNoInteractions(tokens);
    }

    @Test
    void shortPasswordIsRejectedAtStartup() {
        assertThrows(IllegalStateException.class, () -> initializer("short").run(null));
        verifyNoInteractions(users);
    }

    @Test
    void missingAdminAccountDoesNotFailStartup() {
        when(users.findByEmail("admin@sba.example")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> initializer("new-password-1").run(null));
        verifyNoInteractions(tokens);
    }
}
