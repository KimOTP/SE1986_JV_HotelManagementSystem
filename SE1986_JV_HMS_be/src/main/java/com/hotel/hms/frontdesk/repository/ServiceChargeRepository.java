package com.hotel.hms.frontdesk.repository;


import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.*;

public interface ServiceChargeRepository extends JpaRepository<ServiceCharge, Long> {
    @Query("select so from ServiceCharge so join fetch so.service where so.bookingRoom.booking.id = :bookingId and so.status='DELIVERED' order by so.id")
    List<ServiceCharge> findDeliveredByBooking(@Param("bookingId") Long bookingId);

}

