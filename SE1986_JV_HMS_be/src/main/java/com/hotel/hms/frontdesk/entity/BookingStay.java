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
@Table(name = "bookings", schema = "booking")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class BookingStay {
    @Id
    @EqualsAndHashCode.Include
    @ToString.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "booking_id")
    private Long id;

    @Column(name = "booking_code", length = 30)
    private String code;

    @Column(name = "customer_id")
    private Long customerId;

    @Column(name = "hotel_id")
    private Long hotelId;

    @Column(name = "check_in_date")
    private LocalDate checkIn;

    @Column(name = "check_out_date")
    private LocalDate checkOut;

    @Column(name = "guest_count")
    private Integer guests;

    @Column(name = "status", length = 25)
    private String status;

    @org.hibernate.annotations.Nationalized
    @Column(name = "contact_name", length = 150)
    private String guestName;

    @org.hibernate.annotations.Nationalized
    @Column(name = "contact_email", length = 254)
    private String email;

    @Column(name = "contact_phone", length = 20)
    private String phone;

    @org.hibernate.annotations.Nationalized
    @Column(name = "special_requests", length = 2000)
    private String specialRequests;

    @Column(name = "deposit_required", precision = 18, scale = 2)
    private BigDecimal depositRequired;

    @Column(name = "hold_expires_at")
    private LocalDateTime holdExpiresAt;

    @org.hibernate.annotations.Nationalized
    @Column(name = "cancel_reason", length = 1000)
    private String cancelReason;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

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

    // SQL Server handles defaults/ROWVERSION. Keep audit timestamps in UTC.
    @PreUpdate
    private void updateAudit() {
        this.updatedAt = LocalDateTime.now(java.time.Clock.systemUTC());
    }
}
