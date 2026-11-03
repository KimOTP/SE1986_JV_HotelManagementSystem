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

@Service
public class PaymentService {
    @Autowired private PaymentRepository paymentRepository;

    public BigDecimal depositPaid(Long bookingId) {
        BigDecimal value = paymentRepository.sumNetDeposits(bookingId);
        return value == null ? BigDecimal.ZERO : value;
    }

    public BigDecimal paidForInvoice(Long invoiceId) {
        BigDecimal value = paymentRepository.sumNetInvoicePayments(invoiceId);
        return value == null ? BigDecimal.ZERO : value;
    }

    public String lastPaymentMethod(Long invoiceId) {
        return paymentRepository
                .findFirstByInvoice_IdAndTransactionTypeAndStatusOrderByPaidAtDescIdDesc(
                        invoiceId, "PAYMENT", "SUCCESS")
                .map(PaymentTransaction::getMethod).orElse(null);
    }

    // Only for cash/bank transfer already verified by an authorized staff member.
    // Caller owns @Transactional and locks the booking -> invoice in that order.
    public PaymentTransaction recordManualPayment(BookingStay booking, InvoiceRecord invoice,
                                                  String method, BigDecimal amount, Long actorId) {
        if (!"CASH".equals(method) && !"BANK_TRANSFER".equals(method)) {
            throw ApiException.bad("Không hỗ trợ xác nhận tự động thẻ/gateway. Chỉ CASH/BANK_TRANSFER.");
        }
        if (amount == null || amount.signum() <= 0) throw ApiException.bad("Số tiền phải > 0.");
        PaymentTransaction transaction = new PaymentTransaction();
        transaction.setBooking(booking);
        transaction.setInvoice(invoice);
        transaction.setCode("TX-" + UUID.randomUUID().toString().replace("-", "").toUpperCase());
        transaction.setTransactionType("PAYMENT");
        transaction.setMethod(method);
        transaction.setAmount(amount);
        transaction.setStatus("SUCCESS");
        transaction.setProcessedBy(actorId);
        transaction.setPaidAt(LocalDateTime.now(ZoneOffset.UTC));
        return paymentRepository.save(transaction);
    }
}
