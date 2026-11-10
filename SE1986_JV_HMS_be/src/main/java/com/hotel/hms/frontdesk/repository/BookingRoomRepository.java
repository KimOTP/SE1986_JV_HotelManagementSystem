package com.hotel.hms.frontdesk.repository;

import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.*;

public interface BookingRoomRepository extends JpaRepository<RoomStay, Long> {
    @EntityGraph(attributePaths = {"room", "room.roomType"})
    List<RoomStay> findByBooking_IdOrderByIdAsc(Long bookingId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<RoomStay> findLockedByBooking_IdOrderByIdAsc(Long bookingId);
    long countByRoom_IdAndBooking_IdNotAndBooking_Status(Long roomId, Long bookingId, String status);

}
