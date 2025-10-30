package com.traffic_stream.dashboard.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class TrafficMetricsDTO {

    @JsonProperty("camera_id")
    private String cameraId;

    @JsonProperty("camera_name")
    private String cameraName;

    @JsonProperty("district")
    private String district;

    @JsonProperty("liveview_url")
    private String liveviewUrl;

    @JsonProperty("coordinates")
    private List<Double> coordinates;

    @JsonProperty("total_count")
    private int totalCount;

    @JsonProperty("detection_details")
    private Map<String, Integer> detectionDetails;

    @JsonProperty("timestamp")
    private long timestamp;

    @JsonProperty("timestamp_vn")
    private String timestampVn;

    @JsonProperty("annotated_image_url")
    private String annotatedImageUrl;
}