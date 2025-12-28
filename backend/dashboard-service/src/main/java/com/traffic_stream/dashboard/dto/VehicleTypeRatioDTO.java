package com.traffic_stream.dashboard.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class VehicleTypeRatioDTO {
    private String vehicleType;
    private long count;
    private double percentage;
}