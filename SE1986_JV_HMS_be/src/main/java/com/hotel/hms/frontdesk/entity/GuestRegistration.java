package com.hotel.hms.frontdesk.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "guest_registrations", schema = "booking")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class GuestRegistration {
    @Id
    @EqualsAndHashCode.Include
    @ToString.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "guest_registration_id")
    private Long id;

    @org.hibernate.annotations.Nationalized
    @Column(name = "full_name", length = 150)
    private String fullName;

    @Column(name = "document_type", length = 20)
    private String documentType;

    @org.hibernate.annotations.Nationalized
    @Column(name = "document_number", length = 50)
    private String documentNumber;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @org.hibernate.annotations.Nationalized
    @Column(name = "nationality", length = 100)
    private String nationality;

    @Column(name = "is_primary")
    private Boolean primary;

    @Column(name = "registered_at", insertable = false, updatable = false)
    private LocalDateTime registeredAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_room_id", nullable = false)
    private RoomStay bookingRoom;
}
