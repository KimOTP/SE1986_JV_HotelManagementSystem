package com.hotel.hms.rooms.security;

import com.hotel.hms.identity.security.AuthUserDetails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Component
public class InventoryScope {
    private final JdbcTemplate jdbc;
    private final Long defaultHotel;
    public InventoryScope(JdbcTemplate jdbc, @Value("${inventory.default-hotel-id:${INVENTORY_DEFAULT_HOTEL_ID:0}}") Long defaultHotel) {
        this.jdbc = jdbc;
        this.defaultHotel = defaultHotel;
    }
    public long publicHotel() { return activeHotel(defaultHotel); }
    public long managementHotel() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthUserDetails user))
            throw new ResponseStatusException(UNAUTHORIZED, "Vui lòng đăng nhập.");
        var memberships = jdbc.queryForList("""
                SELECT s.hotel_id FROM identity_access.staff s
                JOIN identity_access.users u ON u.user_id=s.user_id
                WHERE s.user_id=? AND s.is_active=1 AND u.is_active=1
                """, Long.class, user.getId());
        if (memberships.size() == 1) return activeHotel(memberships.getFirst());
        // Seed Admin has no staff record. Only Admin may use the server-configured hotel.
        if (user.getRoles().contains("ADMIN")) return activeHotel(defaultHotel);
        throw new ResponseStatusException(FORBIDDEN, "Không có phạm vi khách sạn hợp lệ.");
    }
    private long activeHotel(Long id) {
        if (id == null || id <= 0) throw new ResponseStatusException(SERVICE_UNAVAILABLE,
                "Cần cấu hình INVENTORY_DEFAULT_HOTEL_ID cho Module B.");
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM identity_access.hotels WHERE hotel_id=? AND is_active=1", Integer.class, id);
        if (count == null || count != 1) throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Khách sạn cấu hình không tồn tại hoặc đã ngừng hoạt động.");
        return id;
    }
}
