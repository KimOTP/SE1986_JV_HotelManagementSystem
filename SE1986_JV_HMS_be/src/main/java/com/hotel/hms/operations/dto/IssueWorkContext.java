package com.hotel.hms.operations.dto;

public record IssueWorkContext(boolean enabled, Long staffId, String staffName, String message) {}
