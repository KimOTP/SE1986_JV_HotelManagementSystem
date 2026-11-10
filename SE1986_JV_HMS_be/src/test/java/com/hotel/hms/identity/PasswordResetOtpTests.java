package com.hotel.hms.identity;

import com.hotel.hms.common.exception.ApiException;
import com.hotel.hms.identity.dto.ResetPasswordWithOtpRequest;
import com.hotel.hms.identity.entity.AuthToken;
import com.hotel.hms.identity.entity.TokenPurpose;
import com.hotel.hms.identity.entity.User;
import com.hotel.hms.identity.mail.MailService;
import com.hotel.hms.identity.mail.OtpProperties;
import com.hotel.hms.identity.repository.AuthTokenRepository;
import com.hotel.hms.identity.repository.UserRepository;
import com.hotel.hms.identity.security.JwtProperties;
import com.hotel.hms.identity.service.PasswordResetServiceImpl;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PasswordResetOtpTests {

    private final UserRepository users = mock(UserRepository.class);
    private final AuthTokenRepository tokens = mock(AuthTokenRepository.class);
    private final MailService mail = mock(MailService.class);
    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
    private final PasswordResetServiceImpl service = new PasswordResetServiceImpl(
            users, tokens, encoder, mail,
            new OtpProperties(10, 60, 3),
            new JwtProperties("c2VjcmV0", "test", 900, 604800));

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(5L);
        user.setEmail("customer@example.test");
        user.setFullName("Khách Hàng");
        user.setActive(true);
        user.setPasswordHash(encoder.encode("old-password"));
        when(users.findByEmail("customer@example.test")).thenReturn(Optional.of(user));
    }

    /** Xin mã và lấy lại cả mã gửi đi lẫn bản ghi đã lưu, như hộp thư và DB sẽ thấy. */
    private record Issued(String otp, AuthToken stored) {
    }

    private Issued requestAndCapture() {
        service.requestReset("Customer@Example.TEST");
        ArgumentCaptor<String> otp = ArgumentCaptor.forClass(String.class);
        verify(mail).sendPasswordResetOtp(eq("customer@example.test"), eq("Khách Hàng"), otp.capture(), eq(10));
        ArgumentCaptor<AuthToken> saved = ArgumentCaptor.forClass(AuthToken.class);
        verify(tokens).save(saved.capture());
        return new Issued(otp.getValue(), saved.getValue());
    }

    private void storedTokenIsFound(AuthToken token) {
        when(tokens.findByTokenHashAndPurpose(eq(token.getTokenHash()), eq(TokenPurpose.PASSWORD_RESET)))
                .thenReturn(Optional.of(token));
    }

    @Test
    void requestSendsSixDigitCodeAndStoresOnlyItsHash() {
        Issued issued = requestAndCapture();

        assertTrue(issued.otp().matches("\\d{6}"));
        assertEquals(TokenPurpose.PASSWORD_RESET, issued.stored().getPurpose());
        assertEquals(64, issued.stored().getTokenHash().length());
        assertFalse(issued.stored().getTokenHash().contains(issued.otp()));
        assertTrue(issued.stored().getExpiresAt().isAfter(LocalDateTime.now(ZoneOffset.UTC).plusMinutes(9)));
        verify(tokens).revokeAllActive(eq(5L), eq(TokenPurpose.PASSWORD_RESET), any());
    }

    @Test
    void requestForUnknownOrDisabledAccountDoesNothing() {
        service.requestReset("nobody@example.test");
        user.setActive(false);
        service.requestReset("customer@example.test");

        verifyNoInteractions(mail);
        verify(tokens, never()).save(any());
    }

    @Test
    void requestWithinCooldownIsIgnored() {
        AuthToken recent = new AuthToken();
        recent.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC).minusSeconds(10));
        when(tokens.findFirstByUser_IdAndPurposeOrderByCreatedAtDesc(5L, TokenPurpose.PASSWORD_RESET))
                .thenReturn(Optional.of(recent));

        service.requestReset("customer@example.test");

        verifyNoInteractions(mail);
        verify(tokens, never()).save(any());
    }

    @Test
    void requestAfterCooldownIssuesNewCode() {
        AuthToken old = new AuthToken();
        old.setCreatedAt(LocalDateTime.now(ZoneOffset.UTC).minusSeconds(120));
        when(tokens.findFirstByUser_IdAndPurposeOrderByCreatedAtDesc(5L, TokenPurpose.PASSWORD_RESET))
                .thenReturn(Optional.of(old));

        service.requestReset("customer@example.test");

        verify(mail).sendPasswordResetOtp(anyString(), anyString(), anyString(), anyInt());
    }

    @Test
    void mailFailureDoesNotLeakThroughTheApi() {
        doThrow(new RuntimeException("smtp down")).when(mail).sendPasswordResetOtp(any(), any(), any(), anyInt());

        assertDoesNotThrow(() -> service.requestReset("customer@example.test"));
    }

    @Test
    void correctCodeChangesPasswordAndRevokesEverything() {
        Issued issued = requestAndCapture();
        issued.stored().setCreatedAt(LocalDateTime.now(ZoneOffset.UTC));
        storedTokenIsFound(issued.stored());

        service.resetPassword("customer@example.test", issued.otp(), "new-password");

        assertTrue(encoder.matches("new-password", user.getPasswordHash()));
        assertNotNull(issued.stored().getConsumedAt());
        verify(tokens).revokeAllActive(eq(5L), eq(TokenPurpose.REFRESH), any());
    }

    @Test
    void codeCanOnlyBeUsedOnce() {
        Issued issued = requestAndCapture();
        storedTokenIsFound(issued.stored());
        service.resetPassword("customer@example.test", issued.otp(), "new-password");

        ApiException error = assertThrows(ApiException.class,
                () -> service.resetPassword("customer@example.test", issued.otp(), "another-password"));

        assertEquals("INVALID_OTP", error.getCode());
        assertTrue(encoder.matches("new-password", user.getPasswordHash()));
    }

    @Test
    void wrongCodeIsRejectedAndPasswordStaysTheSame() {
        String oldHash = user.getPasswordHash();
        when(tokens.findByTokenHashAndPurpose(anyString(), any())).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class,
                () -> service.resetPassword("customer@example.test", "000000", "new-password"));

        assertEquals("INVALID_OTP", error.getCode());
        assertEquals(oldHash, user.getPasswordHash());
    }

    @Test
    void expiredCodeIsRejected() {
        Issued issued = requestAndCapture();
        issued.stored().setExpiresAt(LocalDateTime.now(ZoneOffset.UTC).minusSeconds(1));
        storedTokenIsFound(issued.stored());

        assertThrows(ApiException.class,
                () -> service.resetPassword("customer@example.test", issued.otp(), "new-password"));
        assertTrue(encoder.matches("old-password", user.getPasswordHash()));
    }

    @Test
    void codeIsRevokedAfterTooManyWrongAttempts() {
        when(tokens.findByTokenHashAndPurpose(anyString(), any())).thenReturn(Optional.empty());

        for (int i = 0; i < 3; i++) {
            assertThrows(ApiException.class,
                    () -> service.resetPassword("customer@example.test", "111111", "new-password"));
        }

        // Lần thứ 3 sai (maxAttempts = 3) thì mã đang hiệu lực bị hủy.
        verify(tokens, times(1)).revokeAllActive(eq(5L), eq(TokenPurpose.PASSWORD_RESET), any());
    }

    @Test
    void unknownEmailGivesTheSameErrorAsWrongCode() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.resetPassword("nobody@example.test", "123456", "new-password"));

        assertEquals("INVALID_OTP", error.getCode());
    }

    @Test
    void requestsAreValidated() {
        assertTrue(validator.validate(new ResetPasswordWithOtpRequest("a@example.test", "123456", "secret1")).isEmpty());
        assertFalse(validator.validate(new ResetPasswordWithOtpRequest("a@example.test", "12345", "secret1")).isEmpty());
        assertFalse(validator.validate(new ResetPasswordWithOtpRequest("a@example.test", "12345a", "secret1")).isEmpty());
        assertFalse(validator.validate(new ResetPasswordWithOtpRequest("a@example.test", "123456", "12345")).isEmpty());
        assertFalse(validator.validate(new ResetPasswordWithOtpRequest("bad", "123456", "secret1")).isEmpty());
    }
}
