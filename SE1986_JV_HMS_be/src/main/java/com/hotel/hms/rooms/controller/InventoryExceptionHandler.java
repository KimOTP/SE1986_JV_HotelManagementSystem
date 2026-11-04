package com.hotel.hms.rooms.controller;

import com.hotel.hms.rooms.controller.InventoryController;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.sql.SQLException;
import java.util.Map;

@Order(-10)
@RestControllerAdvice(basePackageClasses = InventoryController.class)
public class InventoryExceptionHandler {
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<?> database(DataAccessException error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof SQLException sql && (sql.getErrorCode() == 2601 || sql.getErrorCode() == 2627
                    || sql.getErrorCode() == 547 || sql.getErrorCode() == 51001 || sql.getErrorCode() == 51002
                    || sql.getErrorCode() == 1205)) {
                return ResponseEntity.status(409).body(Map.of("code", "INVENTORY_CONFLICT", "message",
                        "Dữ liệu trùng, đang được tham chiếu hoặc vừa thay đổi. Hãy tải lại; dùng ngừng hoạt động khi không thể xóa."));
            }
        }
        return ResponseEntity.internalServerError().body(Map.of("code", "INVENTORY_ERROR", "message",
                "Không thể xử lý dữ liệu phòng. Vui lòng thử lại sau."));
    }
}
