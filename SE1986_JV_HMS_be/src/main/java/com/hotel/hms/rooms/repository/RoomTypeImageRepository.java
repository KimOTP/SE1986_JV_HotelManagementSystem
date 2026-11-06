package com.hotel.hms.rooms.repository;

import com.hotel.hms.rooms.entity.RoomTypeImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface RoomTypeImageRepository extends JpaRepository<RoomTypeImage, Long> {
    List<RoomTypeImage> findByRoomTypeHotelIdOrderByRoomTypeIdAscSortOrderAsc(long hotelId);

    @Modifying(flushAutomatically = true)
    @Query("delete from CatalogRoomTypeImage i where i.roomType.id = :typeId")
    void deleteForType(@Param("typeId") long typeId);
}
