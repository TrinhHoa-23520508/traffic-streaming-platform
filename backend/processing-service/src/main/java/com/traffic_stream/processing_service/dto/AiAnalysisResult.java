package com.traffic_stream.processing_service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class AiAnalysisResult {
    @JsonProperty("total_vehicles")
    private int totalVehicles;

    @JsonProperty("vehicle_counts")
    private VehicleCounts vehicleCounts;

    @Data
    public static class VehicleCounts {
        private int car;
        private int motorcycle;
        private int bus;
        private int truck;
    }
}