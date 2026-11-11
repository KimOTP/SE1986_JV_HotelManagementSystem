package com.hotel.hms.operations.security;

import com.hotel.hms.identity.security.AuthUserDetails;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/** Only accepts the principal populated by Module A's verified JWT filter. No demo fallback. */
@Component
public class OperationsIdentity {
    public AuthUserDetails requireUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof AuthUserDetails user)
                || !user.isEnabled()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Vui lòng đăng nhập bằng tài khoản database.");
        }
        return user;
    }

    public String email() {
        return requireUser().getEmail();
    }
}
