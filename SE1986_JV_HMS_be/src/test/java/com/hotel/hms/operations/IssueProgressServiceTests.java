package com.hotel.hms.operations;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.service.IssueProgressService;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.*;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.server.ResponseStatusException;
import java.sql.*;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class IssueProgressServiceTests {
    private JdbcTemplate jdbc;
    private MockEnvironment environment;
    private IssueProgressService service;
    @BeforeEach void setup() {
        jdbc = mock(JdbcTemplate.class);
        environment = new MockEnvironment();
        service = new IssueProgressService(jdbc, environment);
    }
    private void worker() {
        environment.setActiveProfiles("local-demo");
        environment.setProperty("operations.demo-staff-email", "housekeeper@sba.example");
        when(jdbc.query(contains("WHERE u.email"), org.mockito.ArgumentMatchers.<RowMapper<IssueProgressService.Worker>>any(), eq("housekeeper@sba.example")))
                .thenReturn(List.of(new IssueProgressService.Worker(3L, 1L, "Housekeeper Demo")));
    }
    private void issue(Long hotelId, Long staffId, String status) {
        when(jdbc.query(contains("FROM operations.issues i"), org.mockito.ArgumentMatchers.<RowMapper<IssueProgressService.IssueState>>any(), eq(1L)))
                .thenReturn(List.of(new IssueProgressService.IssueState(1L, hotelId, staffId, status)));
    }
    private void noWrite() {
        verify(jdbc, never()).update(any(PreparedStatementCreator.class));
        verify(jdbc, never()).update(anyString(), eq(1L), eq(3L));
    }
    @Test void disabledWithoutLocalProfileEvenIfEmailExists() {
        environment.setProperty("operations.demo-staff-email", "housekeeper@sba.example");
        assertFalse(service.getContext().enabled());
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> service.start(1L)).getStatusCode().value());
        verifyNoInteractions(jdbc);
    }
    @Test void disabledForMissingEmail() {
        environment.setActiveProfiles("local-demo");
        assertFalse(service.getContext().enabled());
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> service.resolve(1L, new ResolveIssueRequest("Đã sửa vòi nước"))).getStatusCode().value());
        verifyNoInteractions(jdbc);
    }
    @Test void inactiveOrMissingStaffCannotStartOrResolve() {
        worker();
        when(jdbc.query(contains("WHERE u.email"), org.mockito.ArgumentMatchers.<RowMapper<IssueProgressService.Worker>>any(), eq("housekeeper@sba.example"))).thenReturn(List.of());
        assertFalse(service.getContext().enabled());
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> service.start(1L)).getStatusCode().value());
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> service.resolve(1L, new ResolveIssueRequest("Đã sửa vòi nước"))).getStatusCode().value());
        noWrite();
    }
    @Test void contextUsesDatabaseStaffIdentity() {
        worker();
        var context = service.getContext();
        assertTrue(context.enabled());
        assertEquals(3L, context.staffId());
        assertEquals("Housekeeper Demo", context.staffName());
    }
    @Test void missingOrInactiveIssueReturns404() {
        worker();
        when(jdbc.query(contains("FROM operations.issues i"), org.mockito.ArgumentMatchers.<RowMapper<IssueProgressService.IssueState>>any(), eq(1L))).thenReturn(List.of());
        assertEquals(404, assertThrows(ResponseStatusException.class, () -> service.start(1L)).getStatusCode().value());
        noWrite();
    }
    @Test void rejectsOtherAssigneeUnassignedIssueOrOtherHotel() {
        worker();
        for (var state : List.of(new IssueProgressService.IssueState(1L, 1L, 2L, "ASSIGNED"),
                new IssueProgressService.IssueState(1L, 2L, 3L, "ASSIGNED"),
                new IssueProgressService.IssueState(1L, 1L, null, "OPEN"))) {
            issue(state.hotelId(), state.assignedStaffId(), state.status());
            assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.start(1L)).getStatusCode().value());
            assertEquals(403, assertThrows(ResponseStatusException.class, () -> service.resolve(1L, new ResolveIssueRequest("Đã sửa xong"))).getStatusCode().value());
        }
        noWrite();
    }
    @Test void startOnlyAcceptsAssignedState() {
        worker();
        for (String status : List.of("OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED")) {
            issue(1L, 3L, status);
            assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.start(1L)).getStatusCode().value());
        }
        noWrite();
    }
    @Test void cannotResolveBeforeStartingOrAfterCompletion() {
        worker();
        for (String status : List.of("OPEN", "ASSIGNED", "RESOLVED", "CLOSED")) {
            issue(1L, 3L, status);
            assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.resolve(1L, new ResolveIssueRequest("Đã sửa xong"))).getStatusCode().value());
        }
        noWrite();
    }
    @Test void startWritesOnlyConditionalTransitionForAssignedStaff() {
        worker(); issue(1L, 3L, "ASSIGNED");
        when(jdbc.update(contains("status = 'ASSIGNED'"), eq(1L), eq(3L))).thenReturn(1);
        assertEquals(new IssueProgressResponse(1L, "IN_PROGRESS"), service.start(1L));
        verify(jdbc).update(contains("assigned_staff_id = ? AND status = 'ASSIGNED'"), eq(1L), eq(3L));
    }
    @Test void resolveSavesTrimmedUnicodeNoteAndServerTimestamp() throws Exception {
        worker(); issue(1L, 3L, "IN_PROGRESS");
        var connection = mock(Connection.class);
        var statement = mock(PreparedStatement.class);
        when(connection.prepareStatement(contains("resolved_at = SYSUTCDATETIME()"))).thenReturn(statement);
        when(jdbc.update(any(PreparedStatementCreator.class))).thenAnswer(invocation -> {
            PreparedStatementCreator creator = invocation.getArgument(0);
            assertSame(statement, creator.createPreparedStatement(connection));
            return 1;
        });
        assertEquals(new IssueProgressResponse(1L, "RESOLVED"), service.resolve(1L, new ResolveIssueRequest("  Đã sửa vòi nước  ")));
        verify(statement).setNString(1, "Đã sửa vòi nước");
        verify(statement).setLong(2, 1L);
        verify(statement).setLong(3, 3L);
        verify(connection).prepareStatement(contains("assigned_staff_id = ? AND status = 'IN_PROGRESS'"));
    }
    @Test void concurrentStateChangeNeverReportsSuccess() {
        worker(); issue(1L, 3L, "ASSIGNED");
        when(jdbc.update(anyString(), eq(1L), eq(3L))).thenReturn(0);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.start(1L)).getStatusCode().value());
        issue(1L, 3L, "IN_PROGRESS");
        when(jdbc.update(any(PreparedStatementCreator.class))).thenReturn(0);
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> service.resolve(1L, new ResolveIssueRequest("Đã sửa xong"))).getStatusCode().value());
    }
    @Test void noteValidationRunsAfterTrim() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(new ResolveIssueRequest("  Đã sửa xong  ")).isEmpty());
            assertFalse(validator.validate(new ResolveIssueRequest(null)).isEmpty());
            assertFalse(validator.validate(new ResolveIssueRequest("      ")).isEmpty());
            assertFalse(validator.validate(new ResolveIssueRequest("    a    ")).isEmpty());
            assertFalse(validator.validate(new ResolveIssueRequest("a".repeat(2001))).isEmpty());
        }
    }
}
