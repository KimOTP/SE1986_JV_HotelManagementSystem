package com.hotel.hms.identity.entity;

/** Khớp CHECK constraint của cột auth_tokens.purpose. */
public enum TokenPurpose {
    REFRESH,
    PASSWORD_RESET,
    EMAIL_VERIFY
}
