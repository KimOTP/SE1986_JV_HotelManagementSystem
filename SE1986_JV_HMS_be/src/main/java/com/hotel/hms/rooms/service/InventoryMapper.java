package com.hotel.hms.rooms.service;

import java.util.Map;

public final class InventoryMapper {
    private InventoryMapper() {}
    private static final Map<String,String> ICONS = Map.of("wifi", "Wifi", "snow", "Snow",
            "tv", "Tv", "water", "Droplet", "cup-hot", "CupHot", "shield-lock", "ShieldLock", "sun", "Sun");
    public static String iconToUi(String stored) { return stored == null ? "" : ICONS.getOrDefault(stored, stored); }
    public static String iconToDb(String icon) {
        return ICONS.entrySet().stream().filter(e -> e.getValue().equals(icon)).map(Map.Entry::getKey).findFirst().orElse(icon);
    }
    public static String displayStatus(String operational, String housekeeping) {
        if ("MAINTENANCE".equals(operational) || "OCCUPIED".equals(operational)) return operational;
        return "CLEAN".equals(housekeeping) ? "READY" : "DIRTY";
    }
}
