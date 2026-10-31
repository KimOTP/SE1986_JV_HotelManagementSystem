package com.hotel.hms.operations.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record AssignIssueRequest(@NotNull @Positive Long staffId) {}
