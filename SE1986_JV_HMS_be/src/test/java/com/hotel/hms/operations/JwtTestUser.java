package com.hotel.hms.operations;
import com.hotel.hms.identity.security.AuthUserDetails;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.Set;
import static org.mockito.Mockito.*;
final class JwtTestUser {
    static AuthUserDetails signIn(String email) {
        var user = mock(AuthUserDetails.class);
        when(user.getEmail()).thenReturn(email); when(user.isEnabled()).thenReturn(true);
        when(user.getId()).thenReturn(email.startsWith("customer") ? 5L : email.startsWith("manager") ? 2L : email.startsWith("housekeeper") ? 4L : 3L);
        when(user.getRoles()).thenReturn(Set.of(email.startsWith("customer") ? "CUSTOMER" : email.startsWith("manager") ? "MANAGER" : "STAFF"));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user,null,java.util.List.of()));
        return user;
    }
}
