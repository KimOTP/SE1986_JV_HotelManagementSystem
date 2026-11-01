package com.hotel.hms.frontdesk.repository;

import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.*;

public interface BookingRepository extends JpaRepository<BookingStay, Long> {
    Optional<BookingStay> findByCode(String code);
    List<BookingStay> findByStatusOrderByCheckInAscIdAsc(String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from BookingStay b where b.code = :code")
    Optional<BookingStay> findByCodeForUpdate(@Param("code") String code);

}
