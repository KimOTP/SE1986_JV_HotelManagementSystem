package com.hotel.hms.rooms.repository;

import com.hotel.hms.rooms.entity.Room;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RoomRepository extends JpaRepository<Room, Long> {
    @EntityGraph(attributePaths = "roomType")
    List<Room> findByRoomTypeHotelIdOrderByFloorAscRoomNumberAsc(long hotelId);

    @EntityGraph(attributePaths = "roomType")
    Optional<Room> findByIdAndRoomTypeHotelId(long id, long hotelId);

    boolean existsByRoomTypeId(long roomTypeId);
}
