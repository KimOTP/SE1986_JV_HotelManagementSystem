package com.hotel.hms.operations.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "staff", schema = "identity_access")
public class IssueStaff {
    @Id
    @Column(name = "staff_id")
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private IssueUser user;
    protected IssueStaff() {}
    public Long getId() { return id; }
    public IssueUser getUser() { return user; }
}
