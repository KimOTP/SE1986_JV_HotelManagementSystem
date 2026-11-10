package com.hotel.hms.frontdesk.service;

import com.hotel.hms.frontdesk.entity.BookingStay;
import com.hotel.hms.frontdesk.entity.InvoiceRecord;
import com.hotel.hms.frontdesk.entity.PaymentTransaction;
import com.hotel.hms.frontdesk.repository.PaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import java.util.List;

@Service
public class PaymentService {
    @Autowired private PaymentRepository paymentRepository;

    public BigDecimal depositPaid(Long bookingId) {
        return netAmount(paymentRepository.findByBooking_IdAndStatusAndTransactionTypeIn(
                bookingId, "SUCCESS", List.of("DEPOSIT", "REFUND")), "DEPOSIT");
    }

    public BigDecimal paidForInvoice(Long invoiceId) {
        return netAmount(paymentRepository.findByInvoice_IdAndStatusAndTransactionTypeIn(
                invoiceId, "SUCCESS", List.of("PAYMENT", "REFUND")), "PAYMENT");
    }

    private BigDecimal netAmount(List<PaymentTransaction> transactions, String originalType) {
        return transactions.stream().map(transaction -> {
            if (originalType.equals(transaction.getTransactionType())) return transaction.getAmount();
            if ("REFUND".equals(transaction.getTransactionType())
                    && transaction.getRefundOf() != null
                    && originalType.equals(transaction.getRefundOf().getTransactionType())) {
                return transaction.getAmount().negate();
            }
            return BigDecimal.ZERO;
        }).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public String lastPaymentMethod(Long invoiceId) {
        return paymentRepository
                .findFirstByInvoice_IdAndTransactionTypeAndStatusOrderByPaidAtDescIdDesc(
                        invoiceId, "PAYMENT", "SUCCESS")
                .map(PaymentTransaction::getMethod).orElse(null);
    }

    public boolean hasProviderReference(Long invoiceId, String providerReference) {
        return paymentRepository.existsByInvoice_IdAndProviderReference(invoiceId, providerReference);
    }

    // Invoice payments are bank transfers confirmed by payOS only (no cash).
    // Caller owns @Transactional and locks the booking -> invoice in that order.
    public PaymentTransaction recordPayosPayment(BookingStay booking, InvoiceRecord invoice,
                                                 BigDecimal amount, Long actorId, String providerReference) {
        if (amount == null || amount.signum() <= 0) throw ApiException.bad("Số tiền phải > 0.");
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setBooking(booking);
        transaction.setInvoice(invoice);
        transaction.setCode("TX-" + UUID.randomUUID().toString().replace("-", "").toUpperCase());
        transaction.setTransactionType("PAYMENT");
        transaction.setMethod("BANK_TRANSFER");
        transaction.setProviderReference(providerReference);
        transaction.setAmount(amount);
        transaction.setStatus("SUCCESS");
        transaction.setProcessedBy(actorId);
        transaction.setPaidAt(LocalDateTime.now(ZoneOffset.UTC));
        return paymentRepository.save(transaction);
    }
}
