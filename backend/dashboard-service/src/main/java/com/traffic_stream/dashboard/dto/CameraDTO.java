package com.traffic_stream.dashboard.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "Camera information")
public class CameraDTO {

    @Schema(description = "Unique identifier of the camera", example = "CAM001")
    private String cameraId;

    @Schema(description = "Display name of the camera", example = "Nguyen Hue - Ben Thanh")
    private String cameraName;

    @Schema(description = "District where the camera is located", example = "District 1")
    private String district;
}
