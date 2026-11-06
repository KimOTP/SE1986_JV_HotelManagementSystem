package com.hotel.hms.rooms.repository;

import com.hotel.hms.rooms.dto.AvailableRoom;
import jakarta.persistence.EntityManager;
import jakarta.persistence.ParameterMode;
import org.springframework.stereotype.Repository;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

/** Native reads/locks and the supplied procedure. Never writes another module's tables. */
@Repository
public class InventoryReferenceRepository {
    private final EntityManager entityManager;

    public InventoryReferenceRepository(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public void lockHotel(long hotelId) {
        entityManager.createNativeQuery("""
                SELECT hotel_id FROM identity_access.hotels WITH (UPDLOCK,HOLDLOCK)
                WHERE hotel_id=:hotelId
                """, Long.class).setParameter("hotelId", hotelId).getSingleResult();
    }

    public boolean hasLiveBookings(long roomId) {
        Number count = (Number) entityManager.createNativeQuery("""
                SELECT COUNT(*) FROM booking.booking_rooms br JOIN booking.bookings b ON b.booking_id=br.booking_id
                WHERE br.room_id=:roomId AND (b.status IN ('CONFIRMED','CHECKED_IN')
                OR (b.status='PENDING' AND b.hold_expires_at>SYSUTCDATETIME()))
                """).setParameter("roomId", roomId).getSingleResult();
        return count.longValue() > 0;
    }

    public List<AvailableRoom> availableRooms(long hotelId, LocalDate in, LocalDate out, int guests,
            Long typeId) {
        var query = entityManager.createStoredProcedureQuery("inventory.search_available_rooms")
                .registerStoredProcedureParameter("hotel_id", Long.class, ParameterMode.IN)
                .registerStoredProcedureParameter("check_in", Date.class, ParameterMode.IN)
                .registerStoredProcedureParameter("check_out", Date.class, ParameterMode.IN)
                .registerStoredProcedureParameter("guests_per_room", Integer.class, ParameterMode.IN)
                .registerStoredProcedureParameter("room_type_id", Long.class, ParameterMode.IN)
                .setParameter("hotel_id", hotelId).setParameter("check_in", Date.valueOf(in))
                .setParameter("check_out", Date.valueOf(out)).setParameter("guests_per_room", guests)
                .setParameter("room_type_id", typeId);
        @SuppressWarnings("unchecked")
        List<Object[]> rows = query.getResultList();
        return rows.stream()
                .map(row -> new AvailableRoom(((Number) row[0]).longValue(), ((Number) row[3]).longValue()))
                .toList();
    }
}
