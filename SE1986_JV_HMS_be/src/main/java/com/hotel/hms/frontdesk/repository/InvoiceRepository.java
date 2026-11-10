package com.hotel.hms.frontdesk.repository;
import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.*;

public interface InvoiceRepository extends JpaRepository<InvoiceRecord, Long> {
    Optional<InvoiceRecord> findByNumber(String number);
    Optional<InvoiceRecord> findByBooking_Id(Long bookingId);
    List<InvoiceRecord> findTop500ByDeletedFalseOrderByCreatedAtDescIdDesc();
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<InvoiceRecord> findLockedByNumber(String number);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<InvoiceRecord> findLockedByBooking_Id(Long bookingId);

}
