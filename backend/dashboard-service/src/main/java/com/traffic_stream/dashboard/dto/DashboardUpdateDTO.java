package com.traffic_stream.dashboard.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
@Builder
public class DashboardUpdateDTO {
    private List<HourlyDistrictSummaryDTO> hourlySummary;

    private List<DistrictGrowthDTO> fastestGrowing;

    private List<VehicleTypeRatioDTO> vehicleRatio;

    private List<TopTrafficDTO> busiestDistricts;

    private List<TopTrafficDTO> busiestCameras;

    private long timestamp;
}