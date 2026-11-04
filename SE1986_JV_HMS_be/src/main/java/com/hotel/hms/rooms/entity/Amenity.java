package com.hotel.hms.rooms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

@Getter
@Setter
@Entity(name = "CatalogAmenity")
@Table(name = "amenities", schema = "inventory")
public class Amenity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "amenity_id")
    private Long id;

    @Nationalized
    @Column(nullable = false, length = 100)
    private String name;

    @Nationalized
    @Column(length = 500)
    private String description;

    @Column(length = 100)
    private String icon;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
