package com.hotel.hms.operations.dto;
import jakarta.validation.constraints.*;
public record ReplyFeedbackRequest(@NotBlank @Size(min=5,max=2000) String reply) {
    public ReplyFeedbackRequest { reply=reply==null?null:reply.trim(); }
}
