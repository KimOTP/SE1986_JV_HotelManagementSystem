package com.hotel.hms.rooms.repository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import com.hotel.hms.rooms.entity.AvailableRoom;
import com.hotel.hms.rooms.service.InventoryMapper;

import java.sql.*;
import java.time.LocalDate;
import java.util.*;
import static com.hotel.hms.rooms.dto.InventoryDtos.*;


/** Module-owned JDBC adapter: never writes booking/identity/operations tables.
 * JDBC identity retrieval avoids Hibernate OUTPUT INSERTED incompatibility with SQL Server triggers.
 */
@Repository

public class InventoryRepository {
    private final JdbcTemplate jdbc;
    private final boolean extensions;
    public InventoryRepository(JdbcTemplate jdbc, @Value("${inventory.extensions-enabled:${INVENTORY_EXTENSIONS_ENABLED:false}}") boolean extensions) {
        this.jdbc=jdbc;
        this.extensions=extensions;
    }
    public List<RoomTypeView> types(long hotel, boolean publicOnly) {
        // Batch relation reads avoid one query per room type.
        Map<String,List<String>> amenities = new HashMap<>();
        jdbc.query("""
                SELECT a.room_type_id,a.amenity_id FROM inventory.room_type_amenities a
                JOIN inventory.room_types t ON t.room_type_id=a.room_type_id WHERE t.hotel_id=?
                """, (org.springframework.jdbc.core.RowCallbackHandler) rs -> amenities.computeIfAbsent(rs.getString(1), k -> new ArrayList<>()).add(rs.getString(2)), hotel);
        Map<String,List<String>> images = new HashMap<>();
        if (extensions) jdbc.query("""
                SELECT i.room_type_id,i.image_url FROM inventory.room_type_images i
                JOIN inventory.room_types t ON t.room_type_id=i.room_type_id
                WHERE t.hotel_id=? ORDER BY i.sort_order
                """, (org.springframework.jdbc.core.RowCallbackHandler) rs -> images.computeIfAbsent(rs.getString(1), k -> new ArrayList<>()).add(rs.getString(2)), hotel);
        return jdbc.query("SELECT * FROM inventory.room_types WHERE hotel_id=?" + (publicOnly ? " AND is_active=1" : "") + " ORDER BY base_price,room_type_id",
                (rs,n) -> new RoomTypeView(rs.getString("room_type_id"), rs.getString("name"), text(rs,"description"),
                        rs.getBigDecimal("base_price"),rs.getInt("max_guests"),rs.getBigDecimal("area_m2"),text(rs,"bed_description"),
                        images.getOrDefault(rs.getString("room_type_id"),List.of()),amenities.getOrDefault(rs.getString("room_type_id"),List.of()),rs.getBoolean("is_active"),null),hotel);
    }
    public List<AmenityView> amenities() {
        return jdbc.query("SELECT * FROM inventory.amenities ORDER BY name", (rs,n) -> new AmenityView(rs.getString("amenity_id"),rs.getString("name"),InventoryMapper.iconToUi(rs.getString("icon")),text(rs,"description"),rs.getBoolean("is_active")));
    }
    public List<AmenityView> publicAmenities(long hotel) {
        return jdbc.query("""
                SELECT DISTINCT a.* FROM inventory.amenities a
                JOIN inventory.room_type_amenities x ON x.amenity_id=a.amenity_id
                JOIN inventory.room_types t ON t.room_type_id=x.room_type_id
                WHERE t.hotel_id=? AND t.is_active=1 ORDER BY a.name
                """, (rs,n) -> new AmenityView(rs.getString("amenity_id"),rs.getString("name"),InventoryMapper.iconToUi(rs.getString("icon")),text(rs,"description"),rs.getBoolean("is_active")),hotel);
    }
    public List<RoomView> rooms(long hotel) {
        return jdbc.query("SELECT r.* FROM inventory.rooms r JOIN inventory.room_types t ON t.room_type_id=r.room_type_id WHERE t.hotel_id=? ORDER BY r.floor_number,r.room_number",
                (rs,n) -> new RoomView(rs.getString("room_id"),rs.getString("room_number"),rs.getInt("floor_number"),rs.getString("room_type_id"),extensions?text(rs,"notes"):"",rs.getBoolean("is_active"),rs.getString("operational_status"),rs.getString("housekeeping_status"),InventoryMapper.displayStatus(rs.getString("operational_status"),rs.getString("housekeeping_status"))),hotel);
    }
    public boolean extensionsEnabled() { return extensions; }

    public List<AvailableRoom> availableRooms(long hotel, LocalDate in, LocalDate out, int guests, Long typeId) {
        // The supplied procedure owns the UTC hold and half-open date interval semantics.
        return jdbc.queryForList("EXEC inventory.search_available_rooms @hotel_id=?, @check_in=?, @check_out=?, @guests_per_room=?, @room_type_id=?",
                hotel, java.sql.Date.valueOf(in), java.sql.Date.valueOf(out), guests, typeId).stream()
                .map(row -> new AvailableRoom(((Number) row.get("room_id")).longValue(),
                        ((Number) row.get("room_type_id")).longValue())).toList();
    }

    public List<Boolean> amenityActivityForUpdate(long id) {
        return jdbc.queryForList("SELECT is_active FROM inventory.amenities WITH (UPDLOCK,HOLDLOCK) WHERE amenity_id=?", Boolean.class, id);
    }

    public boolean hasLiveBookings(long id) {
        Integer count = jdbc.queryForObject("""
                SELECT COUNT(*) FROM booking.booking_rooms br JOIN booking.bookings b ON b.booking_id=br.booking_id
                WHERE br.room_id=? AND (b.status IN ('CONFIRMED','CHECKED_IN') OR (b.status='PENDING' AND b.hold_expires_at>SYSUTCDATETIME()))
                """, Integer.class, id);
        return count != null && count > 0;
    }

    public boolean hasRooms(long id) {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM inventory.rooms WHERE room_type_id=?", Integer.class, id);
        return count != null && count > 0;
    }

    public void deleteType(long hotel, long id) {
        jdbc.update("DELETE FROM inventory.room_type_amenities WHERE room_type_id=?", id);
        if (extensions) jdbc.update("DELETE FROM inventory.room_type_images WHERE room_type_id=?", id);
        jdbc.update("DELETE FROM inventory.room_types WHERE room_type_id=? AND hotel_id=?", id, hotel);
    }

    public void deleteRoom(long id) { jdbc.update("DELETE FROM inventory.rooms WHERE room_id=?", id); }
    public void deleteAmenity(long id) { jdbc.update("DELETE FROM inventory.amenities WHERE amenity_id=?", id); }

    public long persistType(long hotel, Long id, RoomTypeWrite input) {
        if(id==null) id=insert("INSERT inventory.room_types(hotel_id,name,description,base_price,max_guests,area_m2,bed_description,is_active) VALUES(?,?,?,?,?,?,?,?)",hotel,input.name(),input.description(),input.basePrice(),input.capacity(),input.area(),input.bedType(),input.isActive());
        else jdbc.update("UPDATE inventory.room_types SET name=?,description=?,base_price=?,max_guests=?,area_m2=?,bed_description=?,is_active=?,updated_at=SYSUTCDATETIME() WHERE room_type_id=? AND hotel_id=?",input.name(),input.description(),input.basePrice(),input.capacity(),input.area(),input.bedType(),input.isActive(),id,hotel);
        jdbc.update("DELETE FROM inventory.room_type_amenities WHERE room_type_id=?",id);
        for(Long amenityId:new HashSet<>(input.amenityIds())) jdbc.update("INSERT inventory.room_type_amenities(room_type_id,amenity_id) VALUES(?,?)",id,amenityId);
        if(extensions) {
            jdbc.update("DELETE FROM inventory.room_type_images WHERE room_type_id=?",id);
            for(int i=0;i<input.images().size();i++) {
                String url=input.images().get(i);
                jdbc.update("INSERT inventory.room_type_images(room_type_id,image_url,sort_order) VALUES(?,?,?)",id,url,i);
            }
        }
        return id;
    }
    public long persistRoom(Long id, RoomWrite input) {
        if(id==null) {
            id=extensions?insert("INSERT inventory.rooms(room_type_id,room_number,floor_number,is_active,notes) VALUES(?,?,?,?,?)",input.roomTypeId(),input.roomNumber(),input.floor(),input.isActive(),input.notes())
                    :insert("INSERT inventory.rooms(room_type_id,room_number,floor_number,is_active) VALUES(?,?,?,?)",input.roomTypeId(),input.roomNumber(),input.floor(),input.isActive());
        } else {
            // Deliberately exclude operational/housekeeping status and row_version from all writes.
            jdbc.update("UPDATE inventory.rooms SET room_type_id=?,room_number=?,floor_number=?,is_active=?,updated_at=SYSUTCDATETIME() WHERE room_id=?",input.roomTypeId(),input.roomNumber(),input.floor(),input.isActive(),id);
            if(extensions) jdbc.update("UPDATE inventory.rooms SET notes=? WHERE room_id=?",input.notes(),id);
        }
        return id;
    }
    public long persistAmenity(Long id, AmenityWrite input) {
        if(id==null) id=insert("INSERT inventory.amenities(name,icon,description,is_active) VALUES(?,?,?,?)",input.name(),InventoryMapper.iconToDb(input.iconKey()),input.description(),input.isActive());
        else jdbc.update("UPDATE inventory.amenities SET name=?,icon=?,description=?,is_active=? WHERE amenity_id=?",input.name(),InventoryMapper.iconToDb(input.iconKey()),input.description(),input.isActive(),id);
        return id;
    }
    public void lockHotel(long hotel) {
        // Same parent lock used by inventory.tr_rooms_number; serialize this module's catalog writes.
        jdbc.queryForObject("SELECT hotel_id FROM identity_access.hotels WITH (UPDLOCK,HOLDLOCK) WHERE hotel_id=?",Long.class,hotel);
    }
    private long insert(String sql,Object... args) {
        return Objects.requireNonNull(jdbc.execute((Connection connection) -> {
            try(PreparedStatement statement=connection.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS)) {
                for(int i=0;i<args.length;i++) {
                    if(args[i] instanceof String value) statement.setNString(i+1,value);
                    else statement.setObject(i+1,args[i]);
                }
                statement.executeUpdate();
                try(ResultSet keys=statement.getGeneratedKeys()) {
                    if(!keys.next()) throw new SQLException("Missing generated identity");
                    return keys.getLong(1);
                }
            }
        }));
    }
    private static String text(ResultSet rs,String name) throws SQLException { String value=rs.getString(name); return value==null?"":value; }
}
