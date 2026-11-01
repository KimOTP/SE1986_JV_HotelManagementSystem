package com.hotel.hms.frontdesk.repository;
import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.*;

public interface InvoiceRepository extends JpaRepository<InvoiceRecord, Long> {
    Optional<InvoiceRecord> findByNumber(String number);
    Optional<InvoiceRecord> findByBooking_Id(Long bookingId);
    List<InvoiceRecord> findTop500ByDeletedFalseOrderByCreatedAtDescIdDesc();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from InvoiceRecord i where i.number = :number")
    Optional<InvoiceRecord> findByNumberForUpdate(@Param("number") String number);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from InvoiceRecord i where i.booking.id = :bookingId")
    Optional<InvoiceRecord> findByBookingIdForUpdate(@Param("bookingId") Long bookingId);

}
