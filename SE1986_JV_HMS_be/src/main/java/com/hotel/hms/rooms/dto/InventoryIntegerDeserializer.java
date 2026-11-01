package com.hotel.hms.rooms.dto;

import tools.jackson.core.JsonParser;
import tools.jackson.core.JsonToken;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

/** Reject decimal JSON tokens rather than letting Jackson truncate floor/capacity. */
public class InventoryIntegerDeserializer extends ValueDeserializer<Integer> {
    @Override public Integer deserialize(JsonParser parser, DeserializationContext context) {
        if(parser.currentToken()==JsonToken.VALUE_NUMBER_INT) return parser.getIntValue();
        if(parser.currentToken()==JsonToken.VALUE_STRING) {
            String value=parser.getValueAsString();
            if(value.matches("-?[0-9]+")) {
                try { return Integer.valueOf(value); } catch(NumberFormatException ignored) { /* report below */ }
            }
        }
        return context.reportInputMismatch(Integer.class,"Phải là số nguyên trong phạm vi INT.");
    }
}
