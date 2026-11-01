package com.hotel.hms.frontdesk.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "payment_transactions", schema = "billing")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PaymentTransaction {
    @Id
    @EqualsAndHashCode.Include
    @ToString.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "transaction_id")
    private Long id;

    @Column(name = "transaction_code", length = 60)
    private String code;

    @Column(name = "transaction_type", length = 20)
    private String transactionType;

    @Column(name = "method", length = 20)
    private String method;

    @Column(name = "amount", precision = 18, scale = 2)
    private BigDecimal amount;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "provider_reference", length = 150)
    private String providerReference;

    @Column(name = "processed_by")
    private Long processedBy;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private BookingStay booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private InvoiceRecord invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_of_transaction_id")
    private PaymentTransaction refundOf;
}
