package com.hotel.hms.frontdesk.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "invoices", schema = "billing")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class InvoiceRecord {
    @Id
    @EqualsAndHashCode.Include
    @ToString.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "invoice_id")
    private Long id;

    @Column(name = "invoice_number", length = 30)
    private String number;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "discount_amount", precision = 18, scale = 2)
    private BigDecimal discount;

    @Column(name = "tax_amount", precision = 18, scale = 2)
    private BigDecimal tax;

    @org.hibernate.annotations.Nationalized
    @Column(name = "note", length = 1000)
    private String note;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "issued_at")
    private LocalDateTime issuedAt;

    @Column(name = "is_deleted")
    private Boolean deleted;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "deleted_by")
    private Long deletedBy;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false)
    private LocalDateTime updatedAt;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(
            name = "row_version",
            columnDefinition = "rowversion",
            length = 8,
            insertable = false,
            updatable = false
    )
    private byte[] rowVersion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private BookingStay booking;

    // SQL Server handles defaults/ROWVERSION. Keep audit timestamps in UTC.
    @PreUpdate
    private void updateAudit() {
        this.updatedAt = LocalDateTime.now(java.time.Clock.systemUTC());
    }
}
