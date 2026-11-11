package com.hotel.hms.operations.repository;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.dto.HousekeepingDashboardResponse.*;

import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;

import java.sql.*;
import java.time.*;
import java.util.*;

/** Database access for Module E; business rules and transactions remain in the service. */
@Repository
public class IssueQueryRepository {
    private final JdbcTemplate jdbc;

    public IssueQueryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Long> findVisibleIds(
            int admin,
            Long userId,
            boolean management,
            Long staffId,
            int page,
            int size,
            String room,
            String status,
            String category) {
        return jdbc.query(
                """
                        SELECT i.issue_id FROM operations.issues i
                        JOIN inventory.rooms r ON r.room_id = i.room_id
                        JOIN inventory.room_types rt ON rt.room_type_id = r.room_type_id
                        JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                        JOIN operations.issue_types it ON it.issue_type_id = i.issue_type_id
                        WHERE r.is_active = 1 AND rt.is_active = 1 AND h.is_active = 1
                          AND (? = 1 OR EXISTS (SELECT 1 FROM identity_access.staff ms
                               WHERE ms.user_id = ? AND ms.hotel_id = rt.hotel_id AND ms.is_active = 1))
                          AND (? = 1 OR i.assigned_staff_id = ? OR i.reported_by = ?)
                          AND (? = '' OR CHARINDEX(?, r.room_number) > 0)
                          AND (? = '' OR i.status = ?) AND (? = '' OR it.name = ?)
                        ORDER BY i.created_at DESC, i.issue_id DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                        """,
                (rs, rowIndex) -> rs.getLong("issue_id"),
                admin,
                userId,
                management ? 1 : 0,
                staffId,
                userId,
                room.trim(),
                room.trim(),
                status.trim(),
                status.trim(),
                category.trim(),
                category.trim(),
                (long) page * size,
                size);
    }
}
