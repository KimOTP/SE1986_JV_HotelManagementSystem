package com.hotel.hms.rooms.dto;

import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

public class InventoryIdDeserializer extends ValueDeserializer<Long> {
    @Override
    public Long deserialize(JsonParser parser, DeserializationContext context) {
        if (parser.currentToken() == JsonToken.VALUE_NUMBER_INT)
            return parser.getLongValue();
        if (parser.currentToken() == JsonToken.VALUE_STRING) {
            String value = parser.getValueAsString();
            if (value.matches("[0-9]+")) {
                try {
                    return Long.valueOf(value);
                } catch (NumberFormatException ignored) {
                    /* report below */ }
            }
        }
        return context.reportInputMismatch(Long.class, "ID phải là số nguyên BIGINT hợp lệ.");
    }
}
