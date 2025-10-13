package com.traffic_stream.dashboard.dto;

import lombok.Data;
import java.time.Instant;
import java.util.Map;

@Data
public class TrafficMetricsDTO {
    private String imageName;
    private String areaId;
    private Map<String, Integer> vehicleCounts;
    private int totalVehicles;
    private String trafficDensity;
    private Instant timestamp;
}
