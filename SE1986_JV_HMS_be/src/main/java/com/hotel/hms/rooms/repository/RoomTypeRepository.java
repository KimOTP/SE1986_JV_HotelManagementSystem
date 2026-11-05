package com.hotel.hms.rooms.repository;

import com.hotel.hms.rooms.entity.RoomType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RoomTypeRepository extends JpaRepository<RoomType, Long> {
    @EntityGraph(attributePaths = "amenities")
    List<RoomType> findByHotelIdOrderByBasePriceAscIdAsc(long hotelId);

    @EntityGraph(attributePaths = "amenities")
    Optional<RoomType> findByIdAndHotelId(long id, long hotelId);
}
