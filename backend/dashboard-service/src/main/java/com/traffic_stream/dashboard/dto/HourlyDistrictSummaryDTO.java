package com.traffic_stream.dashboard.dto;

import com.traffic_stream.dashboard.entity.TrafficMetric;
import lombok.Data;
import java.util.HashMap;
import java.util.Map;

@Data
public class HourlyDistrictSummaryDTO {

    private String district;
    private int hour;
    private long totalCount = 0L;
    private Map<String, Long> detectionDetailsSummary;

    public HourlyDistrictSummaryDTO(String district, int hour) {
        this.district = district;
        this.hour = hour;
        this.detectionDetailsSummary = new HashMap<>();
    }

    public void addMetric(TrafficMetric metric) {
        this.totalCount += metric.getTotalCount();
        if (metric.getDetectionDetails() != null) {
            metric.getDetectionDetails().forEach((vehicleType, count) -> {
                this.detectionDetailsSummary.merge(vehicleType, count.longValue(), Long::sum);
            });
        }
    }
}