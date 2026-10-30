package com.hotel.hms.operations.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "rooms", schema = "inventory")
public class IssueRoom {
    @Id
    @Column(name = "room_id")
    private Long id;
    @Column(name = "room_number", nullable = false, length = 20)
    private String roomNumber;
    protected IssueRoom() {}
    public Long getId() { return id; }
    public String getRoomNumber() { return roomNumber; }
}
