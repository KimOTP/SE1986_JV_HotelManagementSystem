package com.hotel.hms.frontdesk.repository;
import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.*;

public interface HotelRoomRepository extends JpaRepository<HotelRoom, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from HotelRoom r where r.id = :id")
    Optional<HotelRoom> findByIdForUpdate(@Param("id") Long id);

}
