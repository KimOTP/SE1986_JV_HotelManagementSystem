package com.hotel.hms.frontdesk.repository;


import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.*;

public interface ServiceChargeRepository extends JpaRepository<ServiceCharge, Long> {
    @EntityGraph(attributePaths = "service")
    List<ServiceCharge> findByBookingRoom_Booking_IdAndStatusOrderByIdAsc(Long bookingId, String status);

}

