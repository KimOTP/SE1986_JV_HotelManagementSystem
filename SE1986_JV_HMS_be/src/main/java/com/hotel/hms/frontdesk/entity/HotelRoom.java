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
@Table(name = "rooms", schema = "inventory")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class HotelRoom {
    @Id
    @EqualsAndHashCode.Include
    @ToString.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id")
    private Long id;

    @org.hibernate.annotations.Nationalized
    @Column(name = "room_number", length = 20)
    private String roomNumber;

    @Column(name = "floor_number")
    private Integer floorNumber;

    @Column(name = "operational_status", length = 20)
    private String operationalStatus;

    @Column(name = "housekeeping_status", length = 20)
    private String housekeepingStatus;

    @Column(name = "is_active")
    private Boolean active;

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
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomTypeRef roomType;

    // SQL Server handles defaults/ROWVERSION. Keep audit timestamps in UTC.
    @PreUpdate
    private void updateAudit() {
        this.updatedAt = LocalDateTime.now(java.time.Clock.systemUTC());
    }
}
