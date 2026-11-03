package com.hotel.hms.bookings.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * JDBC adapter for the booking write path.
 *
 * <p>JPA entities are intentionally not used here: allocation needs explicit SQL
 * locking and the booking insert needs the generated identity together with
 * SQL Server {@code DATETIME2} values.</p>
 */
@Repository
public class BookingCreationRepository {

    private final JdbcTemplate jdbc;

    public BookingCreationRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * Locks the room type row for the rest of the transaction. All create-booking
     * requests for the same room type are serialized here, so two concurrent
     * requests cannot allocate the same physical room.
     */
    public Optional<RoomTypeSnapshot> lockRoomType(long roomTypeId) {
        String sql = """
                SELECT rt.room_type_id, rt.hotel_id, rt.name, rt.base_price, rt.max_guests,
                       rt.is_active AS type_active, h.is_active AS hotel_active
                FROM inventory.room_types rt WITH (UPDLOCK, HOLDLOCK)
                JOIN identity_access.hotels h ON h.hotel_id = rt.hotel_id
                WHERE rt.room_type_id = ?
                """;
        List<RoomTypeSnapshot> rows = jdbc.query(sql, (rs, rowNum) -> new RoomTypeSnapshot(
                rs.getLong("room_type_id"),
                rs.getLong("hotel_id"),
                rs.getString("name"),
                rs.getBigDecimal("base_price"),
                rs.getInt("max_guests"),
                rs.getBoolean("type_active"),
                rs.getBoolean("hotel_active")
        ), roomTypeId);
        return rows.stream().findFirst();
    }

    /**
     * Reuses the schema-owned availability procedure so the create path and the
     * search catalog share the same half-open date interval and hold semantics.
     */
    public List<AvailableRoom> findAvailableRooms(long hotelId, long roomTypeId,
                                                  LocalDate checkIn, LocalDate checkOut,
                                                  int guestsPerRoom) {
        String sql = """
                EXEC inventory.search_available_rooms
                    @hotel_id=?, @check_in=?, @check_out=?, @guests_per_room=?, @room_type_id=?
                """;
        return jdbc.query(sql, (rs, rowNum) -> new AvailableRoom(
                rs.getLong("room_id"),
                rs.getString("room_number")
        ), hotelId, Date.valueOf(checkIn), Date.valueOf(checkOut), guestsPerRoom, roomTypeId);
    }

    public long insertBooking(NewBooking booking) {
        String sql = """
                INSERT INTO booking.bookings (
                    booking_code, customer_id, hotel_id, check_in_date, check_out_date,
                    guest_count, status, contact_name, contact_email, contact_phone,
                    special_requests, deposit_required, hold_expires_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        KeyHolder keys = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, booking.code());
            ps.setLong(2, booking.customerId());
            ps.setLong(3, booking.hotelId());
            ps.setDate(4, Date.valueOf(booking.checkIn()));
            ps.setDate(5, Date.valueOf(booking.checkOut()));
            ps.setInt(6, booking.guests());
            ps.setNString(7, booking.customerName());
            ps.setNString(8, booking.email());
            ps.setString(9, booking.phone());
            if (booking.specialRequests() == null) {
                ps.setNull(10, Types.NVARCHAR);
            } else {
                ps.setNString(10, booking.specialRequests());
            }
            ps.setBigDecimal(11, booking.depositRequired());
            ps.setObject(12, booking.holdExpiresAt());
            ps.setObject(13, booking.createdAt());
            ps.setObject(14, booking.createdAt());
            return ps;
        }, keys);

        Number key = keys.getKey();
        if (key == null) {
            throw new IllegalStateException("Không thể lấy booking_id sau khi tạo booking.");
        }
        return key.longValue();
    }

    public void insertBookingRooms(long bookingId, List<Long> roomIds, BigDecimal nightlyRate) {
        String sql = "INSERT INTO booking.booking_rooms(booking_id, room_id, nightly_rate) VALUES (?, ?, ?)";
        for (Long roomId : roomIds) {
            jdbc.update(sql, bookingId, roomId, nightlyRate);
        }
    }

    public void insertStatusHistory(long bookingId, long changedBy, String note) {
        String sql = """
                INSERT INTO booking.booking_status_history(booking_id, old_status, new_status, changed_by, note)
                VALUES (?, NULL, 'PENDING', ?, ?)
                """;
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql);
            ps.setLong(1, bookingId);
            ps.setLong(2, changedBy);
            ps.setNString(3, note);
            return ps;
        });
    }

    public record RoomTypeSnapshot(long id, long hotelId, String name, BigDecimal basePrice,
                                   int maxGuests, boolean active, boolean hotelActive) {
    }

    public record AvailableRoom(long roomId, String roomNumber) {
    }

    public record NewBooking(String code, long customerId, long hotelId,
                             LocalDate checkIn, LocalDate checkOut, int guests,
                             String customerName, String email, String phone,
                             String specialRequests, BigDecimal depositRequired,
                             LocalDateTime holdExpiresAt, LocalDateTime createdAt) {
    }
}
