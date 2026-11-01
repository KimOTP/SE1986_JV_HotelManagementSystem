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
@Table(name = "room_types", schema = "inventory")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString(onlyExplicitlyIncluded = true)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class RoomTypeRef {
    @Id
    @EqualsAndHashCode.Include
    @ToString.Include
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_type_id")
    private Long id;

    @Column(name = "hotel_id")
    private Long hotelId;

    @org.hibernate.annotations.Nationalized
    @Column(name = "name", length = 100)
    private String name;

    @org.hibernate.annotations.Nationalized
    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "base_price", precision = 18, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "max_guests")
    private Integer maxGuests;

    @org.hibernate.annotations.Nationalized
    @Column(name = "bed_description", length = 150)
    private String bedDescription;

    @Column(name = "area_m2", precision = 8, scale = 2)
    private BigDecimal area;

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

    // SQL Server handles defaults/ROWVERSION. Keep audit timestamps in UTC.
    @PreUpdate
    private void updateAudit() {
        this.updatedAt = LocalDateTime.now(java.time.Clock.systemUTC());
    }
}
