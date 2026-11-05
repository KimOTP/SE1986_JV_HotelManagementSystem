package com.hotel.hms.rooms.repository;

import com.hotel.hms.rooms.entity.RoomImage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RoomImageRepository extends JpaRepository<RoomImage, Long> {
    List<RoomImage> findByRoomIdOrderBySortOrderAsc(long roomId);
}
