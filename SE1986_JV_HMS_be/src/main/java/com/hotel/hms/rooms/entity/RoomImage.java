package com.hotel.hms.rooms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Nationalized;

/** Physical-room images remain separate from room-type images. No cascade to the room. */
@Getter
@Setter
@Entity(name = "CatalogRoomImage")
@Table(name = "room_images", schema = "inventory")
public class RoomImage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "image_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Nationalized
    @Column(name = "image_url", nullable = false, length = 1000)
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_cover", nullable = false)
    private boolean cover;
}
