package com.traffic_stream.dashboard.shared.utils;

import java.time.*;

public class TimeHelper {

    public static final ZoneId ZONE_VN = ZoneId.of("Asia/Ho_Chi_Minh");

    /**
     * Lấy thời gian hiện tại theo giờ Việt Nam
     */
    public static ZonedDateTime nowVN() {
        return ZonedDateTime.now(ZONE_VN);
    }

    /**
     * Convert Instant (UTC) -> VN ZonedDateTime
     */
    public static ZonedDateTime toVN(Instant instant) {
        return instant.atZone(ZONE_VN);
    }

    /**
     * Convert VN time -> UTC Instant
     */
    public static Instant vnToUTC(ZonedDateTime vnTime) {
        return vnTime.withZoneSameInstant(ZoneOffset.UTC).toInstant();
    }

    /**
     * Parse ISO string (có Z hoặc +07) -> Instant UTC
     */
    public static Instant parseToUTC(String isoString) {
        return Instant.parse(OffsetDateTime.parse(isoString).toInstant().toString());
    }

    /**
     * Format Instant -> ISO 8601 theo giờ VN
     */
    public static String formatVN(Instant instant) {
        return toVN(instant).toString();
    }

    /**
     * Format Instant -> ISO UTC (kết thúc bằng Z)
     */
    public static String formatUTC(Instant instant) {
        return instant.toString();
    }
}

