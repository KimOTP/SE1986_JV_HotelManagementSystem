package com.hotel.hms.rooms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

@Getter
@Setter
@Entity(name = "CatalogRoom")
@Table(name = "rooms", schema = "inventory")
public class Room extends CatalogAudit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "room_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_type_id", nullable = false)
    private RoomType roomType;

    @Nationalized
    @Column(name = "room_number", nullable = false, length = 20)
    private String roomNumber;

    @Column(name = "floor_number", nullable = false)
    private Integer floor;

    @Nationalized
    @Column(length = 2000)
    private String notes;

    // DB defaults on insert; frontdesk/operations own changes to these columns.
    @Column(name = "operational_status", length = 20, nullable = false, insertable = false, updatable = false)
    private String operationalStatus;

    @Column(name = "housekeeping_status", length = 20, nullable = false, insertable = false, updatable = false)
    private String housekeepingStatus;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
