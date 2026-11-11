package com.hotel.hms.operations;
import com.hotel.hms.operations.service.*;
import com.hotel.hms.operations.repository.IssueRepository;
import com.hotel.hms.operations.security.OperationsIdentity;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.*;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class IssueVisibilityServiceTests {
    JdbcTemplate jdbc; IssueRepository repository; IssueAssignmentService managers; IssueProgressService workers; IssueService service;
    @BeforeEach void setup(){jdbc=mock(JdbcTemplate.class);repository=mock(IssueRepository.class);managers=mock(IssueAssignmentService.class);workers=mock(IssueProgressService.class);service=new IssueService(repository,jdbc,new OperationsIdentity(),managers,workers);}
    @AfterEach void clear(){SecurityContextHolder.clearContext();}
    @Test void managerScopeIsAppliedBeforeSqlPagination(){JwtTestUser.signIn("manager@sba.example");when(managers.requireManager()).thenReturn(new IssueAssignmentService.Manager(2L,"Manager",false));service.getIssues(2,5,"103","OPEN","Điện");verify(jdbc).query(contains("ms.hotel_id = rt.hotel_id"),org.mockito.ArgumentMatchers.<RowMapper<Long>>any(),eq(0),eq(2L),eq(1),eq(-1L),eq(2L),eq("103"),eq("103"),eq("OPEN"),eq("OPEN"),eq("Điện"),eq("Điện"),eq(10L),eq(5));verifyNoInteractions(workers,repository);}
    @Test void workerSeesOnlyAssignedOrOwnIssuesInTheirHotel(){JwtTestUser.signIn("housekeeper@sba.example");when(workers.requireWorker()).thenReturn(new IssueProgressService.Worker(3L,1L,"Staff"));service.getIssues(0,5,"","","");verify(jdbc).query(contains("i.assigned_staff_id = ? OR i.reported_by = ?"),org.mockito.ArgumentMatchers.<RowMapper<Long>>any(),eq(0),eq(4L),eq(0),eq(3L),eq(4L),eq(""),eq(""),eq(""),eq(""),eq(""),eq(""),eq(0L),eq(5));verifyNoInteractions(managers,repository);}
}
