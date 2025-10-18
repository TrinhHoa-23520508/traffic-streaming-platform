package com.traffic_stream.processing_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EnrichedTrafficData {
    private String cameraId;
    private String cameraName;
    private long timestamp;
    private CameraRawDTO.Location loc;
    private String imageUrl;
    private Analytics analytics;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Analytics {
        private int vehicleCount;
        private String status; // GREEN, YELLOW, RED
    }
}