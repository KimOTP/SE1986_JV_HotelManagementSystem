package com.hotel.hms.frontdesk.repository;


import com.hotel.hms.frontdesk.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import java.util.*;

public interface PaymentRepository extends JpaRepository<PaymentTransaction, Long> {
    @EntityGraph(attributePaths = "refundOf")
    List<PaymentTransaction> findByBooking_IdAndStatusAndTransactionTypeIn(
            Long bookingId, String status, Collection<String> types);

    @EntityGraph(attributePaths = "refundOf")
    List<PaymentTransaction> findByInvoice_IdAndStatusAndTransactionTypeIn(
            Long invoiceId, String status, Collection<String> types);

    boolean existsByInvoice_IdAndProviderReference(Long invoiceId, String providerReference);

    Optional<PaymentTransaction> findFirstByInvoice_IdAndTransactionTypeAndStatusOrderByPaidAtDescIdDesc(
            Long invoiceId, String transactionType, String status);

}
