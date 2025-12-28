package com.traffic_stream.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DistrictGrowthDTO {
    private String district;
    private double growthRate;
    private long currentCount;
    private long previousCount;
}