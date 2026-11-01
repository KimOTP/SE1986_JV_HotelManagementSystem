package com.hotel.hms.operations;
import com.hotel.hms.operations.dto.HousekeepingDashboardResponse.*;
import com.hotel.hms.operations.service.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.sql.Timestamp;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
class HousekeepingDashboardServiceTests {
 @Test void bangkokDayUsesUtcHalfOpenWindow(){var window=HousekeepingDashboardService.dayWindow(LocalDate.of(2026,11,1),"Asia/Bangkok");assertEquals(LocalDateTime.of(2026,10,31,17,0),window.fromUtc());assertEquals(LocalDateTime.of(2026,11,1,17,0),window.toUtc());}
 @Test void daylightSavingDaysAreNotAssumedToBe24Hours(){var spring=HousekeepingDashboardService.dayWindow(LocalDate.of(2026,3,8),"America/New_York");assertEquals(23,Duration.between(spring.fromUtc(),spring.toUtc()).toHours());var autumn=HousekeepingDashboardService.dayWindow(LocalDate.of(2026,11,1),"America/New_York");assertEquals(25,Duration.between(autumn.fromUtc(),autumn.toUtc()).toHours());}
 @Test void invalidDateOrTimezoneReturns400(){assertThrows(ResponseStatusException.class,()->HousekeepingDashboardService.dayWindow(null,"UTC"));assertThrows(ResponseStatusException.class,()->HousekeepingDashboardService.dayWindow(LocalDate.now(),null));assertThrows(ResponseStatusException.class,()->HousekeepingDashboardService.dayWindow(LocalDate.now(),"INVALID"));assertThrows(ResponseStatusException.class,()->HousekeepingDashboardService.dayWindow(LocalDate.of(10000,1,1),"UTC"));}
 @Test void missingManagerPreventsAnyQuery(){var jdbc=mock(JdbcTemplate.class);var managers=mock(IssueAssignmentService.class);when(managers.requireManager()).thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE));var service=new HousekeepingDashboardService(jdbc,managers);assertThrows(ResponseStatusException.class,()->service.getDashboard(LocalDate.now(),"UTC"));verifyNoInteractions(jdbc);}
 @Test void queriesUseDateWindowAndServerManagerScope(){var jdbc=mock(JdbcTemplate.class);var managers=mock(IssueAssignmentService.class);when(managers.requireManager()).thenReturn(new IssueAssignmentService.Manager(2L,"Manager",false));var from=Timestamp.valueOf("2026-10-31 17:00:00");var to=Timestamp.valueOf("2026-11-01 17:00:00");var summary=new Summary(4,1,1,1,1,1,1);when(jdbc.queryForObject(contains("COUNT_BIG(*)"),org.mockito.ArgumentMatchers.<RowMapper<Summary>>any(),eq(0),eq(from),eq(to),eq(0),eq(2L))).thenReturn(summary);var response=new HousekeepingDashboardService(jdbc,managers).getDashboard(LocalDate.of(2026,11,1),"Asia/Bangkok");assertEquals(summary,response.summary());verify(jdbc).queryForObject(contains("scheduled_at < SYSUTCDATETIME()"),org.mockito.ArgumentMatchers.<RowMapper<Summary>>any(),eq(0),eq(from),eq(to),eq(0),eq(2L));verify(jdbc).query(contains("active_staff"),org.mockito.ArgumentMatchers.<RowMapper<Workload>>any(),eq(0),eq(from),eq(to),eq(0),eq(2L),eq(0),eq(2L));}
 @Test void allTimeScopeDoesNotExcludeTasksOutsideSelectedDay(){var jdbc=mock(JdbcTemplate.class);var managers=mock(IssueAssignmentService.class);when(managers.requireManager()).thenReturn(new IssueAssignmentService.Manager(2L,"Manager",false));var response=new HousekeepingDashboardService(jdbc,managers).getDashboard(LocalDate.of(2026,11,1),"Asia/Bangkok",true);assertTrue(response.allTime());verify(jdbc).queryForObject(contains("WHERE (? = 1 OR"),org.mockito.ArgumentMatchers.<RowMapper<Summary>>any(),eq(1),any(Timestamp.class),any(Timestamp.class),eq(0),eq(2L));}
}
