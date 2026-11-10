package com.hotel.hms.frontdesk.repository;

import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.*;

public interface BookingRepository extends JpaRepository<BookingStay, Long> {
    Optional<BookingStay> findByCode(String code);
    List<BookingStay> findByStatusOrderByCheckInAscIdAsc(String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<BookingStay> findLockedByCode(String code);

}
