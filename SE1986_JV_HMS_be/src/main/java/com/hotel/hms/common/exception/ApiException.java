package com.hotel.hms.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * Lỗi nghiệp vụ có mã HTTP và mã lỗi riêng; message được trả thẳng cho client
 * nên không chứa thông tin nội bộ.
 */
@Getter
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;

    public ApiException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
