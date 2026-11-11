package com.hotel.hms.operations;
import com.hotel.hms.operations.repository.*;
import com.hotel.hms.operations.service.*;
import com.hotel.hms.operations.security.OperationsIdentity;
import com.hotel.hms.identity.security.AuthUserDetails;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.http.HttpStatus.*;
class OperationsFollowUpServiceTests {
 JdbcTemplate jdbc; OperationsIdentity identity; IssueAssignmentService managers; OperationsFollowUpService service;
 final String version="0x0000000000000001";
 @BeforeEach void setup(){jdbc=mock(JdbcTemplate.class);identity=mock(OperationsIdentity.class);managers=mock(IssueAssignmentService.class);service=new OperationsFollowUpService(new OperationsFollowUpRepository(jdbc),identity,managers, new LinkedWorkRepository(jdbc));when(managers.requireManager()).thenReturn(new IssueAssignmentRepository.Manager(2L,"Manager",false));}
 void work(String status){when(jdbc.query(anyString(),org.mockito.ArgumentMatchers.<RowMapper<OperationsFollowUpRepository.Work>>any(),eq(9L))).thenReturn(List.of(new OperationsFollowUpRepository.Work(9L,1L,3L,status,version)));}
 OperationsFollowUpService.Change change(String action,Long staff){return new OperationsFollowUpService.Change(version,action,staff,"Nhân viên nghỉ ca");}
 @Test void wrongHotelCannotChangeWork(){work("PENDING");doThrow(new ResponseStatusException(FORBIDDEN)).when(managers).assertScope(any(),eq(1L));assertEquals(403,assertThrows(ResponseStatusException.class,()->service.change(false,9L,change("CANCEL",null))).getStatusCode().value());verify(jdbc,never()).update(anyString(),any(Object[].class));}
 @Test void staleVersionCannotOverwriteWork(){work("PENDING");assertEquals(409,assertThrows(ResponseStatusException.class,()->service.change(false,9L,new OperationsFollowUpService.Change("0x0000000000000002","CANCEL",null,"Đổi ca trực"))).getStatusCode().value());verify(jdbc,never()).update(anyString(),any(Object[].class));}
 @Test void completedWorkCannotBeCancelled(){work("COMPLETED");assertEquals(409,assertThrows(ResponseStatusException.class,()->service.change(false,9L,change("CANCEL",null))).getStatusCode().value());}
 @Test void issueCannotBeCancelled(){work("ASSIGNED");assertEquals(400,assertThrows(ResponseStatusException.class,()->service.change(true,9L,change("CANCEL",null))).getStatusCode().value());}
 @Test void sameWorkerCannotBeReassigned(){work("PENDING");assertEquals(400,assertThrows(ResponseStatusException.class,()->service.change(false,9L,change("REASSIGN",3L))).getStatusCode().value());}
 @Test void inactiveReplacementCannotReceiveWork(){work("PENDING");when(jdbc.queryForObject(anyString(),eq(Integer.class),eq(4L),eq(1L))).thenReturn(0);assertEquals(400,assertThrows(ResponseStatusException.class,()->service.change(false,9L,change("REASSIGN",4L))).getStatusCode().value());}
 @Test void reassignmentBeforeStartingRecordsAudit(){work("PENDING");when(jdbc.queryForObject(anyString(),eq(Integer.class),eq(4L),eq(1L))).thenReturn(1);when(jdbc.update(startsWith("UPDATE "),any(Object[].class))).thenReturn(1);service.change(false,9L,change("REASSIGN",4L));verify(jdbc).update(startsWith("UPDATE operations.tasks"),eq(4L),eq(2L),eq("PENDING"),eq(9L),eq(version));verify(jdbc).update(startsWith("INSERT operations.work_history"),eq("TASK"),eq(9L),eq("REASSIGN"),eq(2L),eq(3L),eq(4L),eq("PENDING"),eq("PENDING"),eq("Nhân viên nghỉ ca"));}
 @Test void inProgressWorkCannotBeReassignedOrCancelled(){
  work("IN_PROGRESS");
  for(var request:List.of(change("REASSIGN",4L),change("CANCEL",null))) assertEquals(409,assertThrows(ResponseStatusException.class,()->service.change(false,9L,request)).getStatusCode().value());
  verify(jdbc,never()).update(anyString(),any(Object[].class));
 }
 @Test void cancellationRecordsActorAndReason(){work("PENDING");when(jdbc.update(startsWith("UPDATE "),any(Object[].class))).thenReturn(1);service.change(false,9L,change("CANCEL",null));verify(jdbc).update(startsWith("INSERT operations.work_history"),eq("TASK"),eq(9L),eq("CANCEL"),eq(2L),eq(3L),eq(3L),eq("PENDING"),eq("CANCELLED"),eq("Nhân viên nghỉ ca"));}
 @Test void reportListAlwaysUsesSignedInUser(){var user=mock(AuthUserDetails.class);when(identity.requireUser()).thenReturn(user);when(user.getId()).thenReturn(5L);service.myReports(2,5);verify(jdbc).queryForList(contains("WHERE i.reported_by=?"),eq(5L),eq(10L),eq(5));}
}
