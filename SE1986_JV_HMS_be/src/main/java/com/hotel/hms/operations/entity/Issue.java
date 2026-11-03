package com.hotel.hms.operations.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;
import java.time.LocalDateTime;

@Entity
@Immutable
@Table(name = "issues", schema = "operations")
public class Issue {
    @Id
    @Column(name = "issue_id")
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private IssueRoom room;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "issue_type_id", nullable = false)
    private IssueType issueType;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reported_by", nullable = false)
    private IssueUser reporter;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_staff_id")
    private IssueStaff assignedStaff;
    @Column(name = "title", nullable = false, length = 200)
    private String title;
    @Column(name = "description", nullable = false, length = 2000)
    private String description;
    @Column(name = "priority", nullable = false, length = 15)
    private String priority;
    @Column(name = "status", nullable = false, length = 20)
    private String status;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "resolution_note", length = 2000)
    private String resolutionNote;
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
    protected Issue() {}
    public Long getId() { return id; }
    public IssueRoom getRoom() { return room; }
    public IssueType getIssueType() { return issueType; }
    public IssueUser getReporter() { return reporter; }
    public IssueStaff getAssignedStaff() { return assignedStaff; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public String getPriority() { return priority; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public String getResolutionNote() { return resolutionNote; }
    public LocalDateTime getResolvedAt() { return resolvedAt; }
}
