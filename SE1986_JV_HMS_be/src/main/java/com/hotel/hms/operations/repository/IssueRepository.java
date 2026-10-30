package com.hotel.hms.operations.repository;

import com.hotel.hms.operations.entity.Issue;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import java.util.List;

public interface IssueRepository extends Repository<Issue, Long> {
    // All fetched relations are to-one, so pagination does not truncate collections.
    @Query("""
            select i from Issue i
            join fetch i.room
            join fetch i.issueType
            join fetch i.reporter
            left join fetch i.assignedStaff s
            left join fetch s.user
            order by i.createdAt desc, i.id desc
            """)
    List<Issue> findIssues(Pageable pageable);
}
