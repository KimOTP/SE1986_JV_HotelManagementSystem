package com.hotel.hms.operations;

import com.hotel.hms.operations.dto.*;
import com.hotel.hms.operations.service.IssueReportService;
import jakarta.validation.Validation;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.*;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.server.ResponseStatusException;
import java.sql.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class IssueReportServiceTests {
    private JdbcTemplate jdbc;
    private MockEnvironment environment;
    private IssueReportService service;

    @BeforeEach
    void setup() {
        jdbc = mock(JdbcTemplate.class);
        environment = new MockEnvironment();
        service = new IssueReportService(jdbc, environment);
    }

    private CreateIssueRequest request() {
        return new CreateIssueRequest(3L, 2L, "  Vòi nước hỏng  ", "  Nước bị rò rỉ tại phòng tắm  ", "HIGH");
    }

    private void enableReporter() {
        environment.setActiveProfiles("local-demo");
        environment.setProperty("operations.demo-reporter-email", "reception@sba.example");
        when(jdbc.query(contains("WHERE email"), org.mockito.ArgumentMatchers.<RowMapper<IssueReportService.Reporter>>any(), eq("reception@sba.example")))
                .thenReturn(List.of(new IssueReportService.Reporter(3L, "Reception Demo")));
    }

    private void activeRoom() {
        when(jdbc.query(contains("FROM inventory.rooms"), org.mockito.ArgumentMatchers.<RowMapper<IssueRoomResponse>>any()))
                .thenReturn(List.of(new IssueRoomResponse(3L, "103", "SBA Hotel")));
    }

    @Test
    void reportingDisabledWithoutExplicitProfileEvenIfEmailIsConfigured() {
        environment.setProperty("operations.demo-reporter-email", "reception@sba.example");
        assertFalse(service.getContext().enabled());
        var exception = assertThrows(ResponseStatusException.class, () -> service.create(request()));
        assertEquals(503, exception.getStatusCode().value());
        verifyNoInteractions(jdbc);
    }

    @Test
    void reportingDisabledWithoutConfiguredEmail() {
        environment.setActiveProfiles("local-demo");
        assertFalse(service.getContext().enabled());
        assertThrows(ResponseStatusException.class, () -> service.create(request()));
        verifyNoInteractions(jdbc);
    }

    @Test
    void inactiveOrMissingReporterDisablesWrites() {
        enableReporter();
        when(jdbc.query(contains("WHERE email"), org.mockito.ArgumentMatchers.<RowMapper<IssueReportService.Reporter>>any(), eq("reception@sba.example")))
                .thenReturn(List.of());
        assertFalse(service.getContext().enabled());
        assertEquals(503, assertThrows(ResponseStatusException.class, () -> service.create(request())).getStatusCode().value());
        verify(jdbc, never()).update(any(PreparedStatementCreator.class), any(KeyHolder.class));
    }

    @Test
    void rejectsUnknownOrInactiveRoomWithoutInsert() {
        enableReporter();
        when(jdbc.query(contains("FROM inventory.rooms"), org.mockito.ArgumentMatchers.<RowMapper<IssueRoomResponse>>any())).thenReturn(List.of());
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(request())).getStatusCode().value());
        verify(jdbc, never()).update(any(PreparedStatementCreator.class), any(KeyHolder.class));
    }

    @Test
    void rejectsUnknownOrInactiveTypeWithoutInsert() {
        enableReporter();
        activeRoom();
        when(jdbc.queryForObject(contains("operations.issue_types"), eq(Integer.class), eq(2L))).thenReturn(0);
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(request())).getStatusCode().value());
        verify(jdbc, never()).update(any(PreparedStatementCreator.class), any(KeyHolder.class));
    }

    @Test
    void insertUsesConfiguredReporterUnicodeAndDatabaseGeneratedId() throws Exception {
        enableReporter();
        activeRoom();
        when(jdbc.queryForObject(contains("operations.issue_types"), eq(Integer.class), eq(2L))).thenReturn(1);
        var connection = mock(Connection.class);
        var statement = mock(PreparedStatement.class);
        when(connection.prepareStatement(contains("'OPEN'"), eq(Statement.RETURN_GENERATED_KEYS))).thenReturn(statement);
        when(jdbc.update(any(PreparedStatementCreator.class), any(KeyHolder.class))).thenAnswer(invocation -> {
            PreparedStatementCreator creator = invocation.getArgument(0);
            assertSame(statement, creator.createPreparedStatement(connection));
            KeyHolder key = invocation.getArgument(1);
            key.getKeyList().add(new HashMap<>(Map.of("issue_id", 12L)));
            return 1;
        });
        assertEquals(new CreatedIssueResponse(12L, "OPEN"), service.create(request()));
        verify(statement).setLong(1, 3L);
        verify(statement).setLong(2, 2L);
        verify(statement).setLong(3, 3L);
        verify(statement).setNString(4, "Vòi nước hỏng");
        verify(statement).setNString(5, "Nước bị rò rỉ tại phòng tắm");
        verify(statement).setString(6, "HIGH");
    }

    @Test
    void trimsBeforeValidationAndRejectsInvalidPayloads() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(request()).isEmpty());
            assertFalse(validator.validate(new CreateIssueRequest(3L, 2L, "   ", "valid description", "NORMAL")).isEmpty());
            assertFalse(validator.validate(new CreateIssueRequest(3L, 2L, "Title", "    a    ", "NORMAL")).isEmpty());
            assertFalse(validator.validate(new CreateIssueRequest(-1L, 2L, "Title", "valid description", "INVALID")).isEmpty());
            assertFalse(validator.validate(new CreateIssueRequest(3L, null, "a".repeat(201), "b".repeat(2001), null)).isEmpty());
        }
    }
}
