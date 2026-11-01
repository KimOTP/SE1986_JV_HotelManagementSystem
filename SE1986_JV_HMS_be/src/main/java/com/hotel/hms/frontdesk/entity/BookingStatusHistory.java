package com.hotel.hms.frontdesk.entity;


import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "booking_status_history", schema = "booking")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class BookingStatusHistory {
    @Id
    @EqualsAndHashCode.Include
    @ToString.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "history_id")
    private Long id;

    @Column(name = "old_status", length = 25)
    private String oldStatus;

    @Column(name = "new_status", length = 25)
    private String newStatus;

    @Column(name = "changed_by")
    private Long changedBy;

    @Column(name = "changed_at", insertable = false, updatable = false)
    private LocalDateTime changedAt;

    @org.hibernate.annotations.Nationalized
    @Column(name = "note", length = 1000)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private BookingStay booking;
}
