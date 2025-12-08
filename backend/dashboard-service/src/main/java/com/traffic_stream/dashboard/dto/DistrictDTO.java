package com.traffic_stream.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "District information")
public class DistrictDTO {

    @Schema(description = "Name of the district", example = "District 1")
    private String districtName;
}
