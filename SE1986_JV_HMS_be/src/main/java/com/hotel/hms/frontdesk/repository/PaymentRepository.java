package com.hotel.hms.frontdesk.repository;


import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.*;

public interface PaymentRepository extends JpaRepository<PaymentTransaction, Long> {
    @Query("""
        select coalesce(sum(case
          when p.transactionType='DEPOSIT' then p.amount
          when p.transactionType='REFUND' and origin.transactionType='DEPOSIT' then -p.amount
          else 0 end), 0)
        from PaymentTransaction p left join p.refundOf origin
        where p.booking.id=:bookingId and p.status='SUCCESS'
        """)
    BigDecimal sumNetDeposits(@Param("bookingId") Long bookingId);

    @Query("""
        select coalesce(sum(case
          when p.transactionType='PAYMENT' then p.amount
          when p.transactionType='REFUND' and origin.transactionType='PAYMENT' then -p.amount
          else 0 end), 0)
        from PaymentTransaction p left join p.refundOf origin
        where p.invoice.id=:invoiceId and p.status='SUCCESS'
        """)
    BigDecimal sumNetInvoicePayments(@Param("invoiceId") Long invoiceId);

    Optional<PaymentTransaction> findFirstByInvoice_IdAndTransactionTypeAndStatusOrderByPaidAtDescIdDesc(
            Long invoiceId, String transactionType, String status);

}
