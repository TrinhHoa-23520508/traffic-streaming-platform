package com.traffic_stream.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReportSummaryDTO {
    private String district;
    private Long totalVehicles;
    private String peakHour;
    private List<String> topCameras;
}

