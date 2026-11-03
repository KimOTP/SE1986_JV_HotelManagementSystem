package com.hotel.hms.common.exception;

/**
 * Body lỗi thống nhất cho mọi API. FE đọc trường {@code message} để hiển thị.
 */
public record ApiError(String code, String message) {
}
