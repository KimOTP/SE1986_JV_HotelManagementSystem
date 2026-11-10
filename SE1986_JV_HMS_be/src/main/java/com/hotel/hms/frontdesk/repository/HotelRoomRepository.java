package com.hotel.hms.frontdesk.repository;
import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.*;

public interface HotelRoomRepository extends JpaRepository<HotelRoom, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<HotelRoom> findLockedById(Long id);

}
