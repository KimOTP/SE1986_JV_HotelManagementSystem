package com.hotel.hms.frontdesk.repository;
import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.*;

public interface GuestRegistrationRepository extends JpaRepository<GuestRegistration, Long> {
    List<GuestRegistration> findByBookingRoom_Id(Long bookingRoomId);

}
