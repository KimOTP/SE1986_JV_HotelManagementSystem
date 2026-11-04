package com.hotel.hms.rooms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;
import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;

@Getter
@Setter
@Entity(name = "CatalogRoomType")
@Table(name = "room_types", schema = "inventory")
public class RoomType extends CatalogAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_type_id")
    private Long id;

    @Column(name = "hotel_id", nullable = false, updatable = false)
    private Long hotelId;

    @Nationalized
    @Column(nullable = false, length = 100)
    private String name;

    @Nationalized
    @Column(length = 2000)
    private String description;

    @Column(name = "base_price", nullable = false, precision = 18, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "max_guests", nullable = false)
    private Integer capacity;

    @Nationalized
    @Column(name = "bed_description", length = 150)
    private String bedType;

    @Column(name = "area_m2", precision = 8, scale = 2)
    private BigDecimal area;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    // Only this join table is owned here; never cascade deletes to amenities or other modules.
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "room_type_amenities", schema = "inventory", joinColumns = @JoinColumn(name = "room_type_id"), inverseJoinColumns = @JoinColumn(name = "amenity_id"))
    private Set<Amenity> amenities = new LinkedHashSet<>();
}
