package com.hotel.hms.frontdesk.repository;

import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.*;

public interface BookingRoomRepository extends JpaRepository<RoomStay, Long> {
    @Query("select br from RoomStay br join fetch br.room r join fetch r.roomType where br.booking.id = :bookingId order by br.id")
    List<RoomStay> findRooms(@Param("bookingId") Long bookingId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select br from RoomStay br where br.booking.id = :bookingId order by br.id")
    List<RoomStay> findRoomsForUpdate(@Param("bookingId") Long bookingId);
    @Query("select count(br) from RoomStay br where br.room.id=:roomId and br.booking.id<>:bookingId and br.booking.status='CHECKED_IN'")
    long countOtherInHouse(@Param("roomId") Long roomId, @Param("bookingId") Long bookingId);

}
