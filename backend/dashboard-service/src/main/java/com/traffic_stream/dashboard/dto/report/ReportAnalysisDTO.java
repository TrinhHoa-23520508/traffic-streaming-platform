package com.traffic_stream.dashboard.dto.report;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * DTO chứa toàn bộ phân tích dữ liệu cho báo cáo PDF
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Phân tích đầy đủ cho báo cáo giao thông")
public class ReportAnalysisDTO {

    // I. THÔNG TIN BÁO CÁO
    @Schema(description = "Tên báo cáo")
    private String reportTitle;

    @Schema(description = "Thời gian bắt đầu")
    private Instant startTime;

    @Schema(description = "Thời gian kết thúc")
    private Instant endTime;

    @Schema(description = "Khoảng tổng hợp (phút)")
    private Integer intervalMinutes;

    @Schema(description = "Số camera được phân tích")
    private Integer totalCameras;

    @Schema(description = "Số camera hoạt động")
    private Integer activeCameras;

    @Schema(description = "Số camera offline")
    private Integer offlineCameras;

    // II. TỔNG HỢP HỆ THỐNG
    @Schema(description = "Tổng số phương tiện")
    private Long totalVehicles;

    @Schema(description = "Số phương tiện trung bình mỗi camera")
    private Double avgVehiclesPerCamera;

    @Schema(description = "Tỷ lệ từng loại phương tiện (Car: 45.2, Bike: 30.1, ...)")
    private Map<String, Double> vehicleTypePercentages;

    @Schema(description = "Quận đông nhất")
    private String busiestDistrict;

    @Schema(description = "Quận vắng nhất")
    private String quietestDistrict;

    @Schema(description = "Camera đông nhất")
    private String busiestCamera;

    @Schema(description = "Camera vắng nhất")
    private String quietestCamera;

    // III. PHÂN TÍCH THEO QUẬN
    @Schema(description = "Danh sách phân tích theo quận")
    private List<DistrictAnalysis> districtAnalyses;

    // IV. PHÂN TÍCH THEO CAMERA
    @Schema(description = "Danh sách phân tích theo camera")
    private List<CameraAnalysis> cameraAnalyses;

    // V. PHÂN TÍCH THEO THỜI GIAN
    @Schema(description = "Danh sách dữ liệu timeline")
    private List<TimelineData> timelineData;

    @Schema(description = "Giờ cao điểm")
    private Instant peakHour;

    @Schema(description = "Lưu lượng cao điểm")
    private Long peakHourVolume;

    @Schema(description = "Giờ thấp điểm")
    private Instant offPeakHour;

    @Schema(description = "Lưu lượng thấp điểm")
    private Long offPeakHourVolume;

    // VI. PHÂN TÍCH LOẠI PHƯƠNG TIỆN
    @Schema(description = "Tổng số từng loại phương tiện")
    private Map<String, Long> vehicleTypeCounts;

    // VII. SỰ KIỆN BẤT THƯỜNG
    @Schema(description = "Danh sách camera offline")
    private List<String> offlineCameraList;

    @Schema(description = "Danh sách sự kiện bất thường")
    private List<AnomalyEvent> anomalies;

    // VIII. MINH HỌA
    @Schema(description = "Danh sách ảnh annotated từ các camera")
    private List<AnnotatedImageInfo> annotatedImages;

    // IX. KẾT LUẬN & KIẾN NGHỊ
    @Schema(description = "Danh sách kết luận và kiến nghị")
    private List<String> conclusions;

    // ===== Nested DTOs =====

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DistrictAnalysis {
        private String districtName;
        private Long totalVehicles;
        private Double percentage;
        private Integer activeCameras;
        private Double avgVehiclesPerCamera;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CameraAnalysis {
        private String cameraId;
        private String cameraName;
        private String district;
        private Long totalVehicles;
        private Double avgVehicles;
        private Boolean isActive;
        private Boolean hasAnomaly;
        private String anomalyType; // "SURGE", "DROP", "OFFLINE"
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimelineData {
        private Instant timestamp;
        private Long totalVehicles;
        private Map<String, Long> byDistrict; // District -> count
        private Map<String, Long> byVehicleType; // Type -> count
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnomalyEvent {
        private String cameraId;
        private String cameraName;
        private String type; // "TRAFFIC_SURGE", "TRAFFIC_DROP", "OFFLINE", "VEHICLE_TYPE_SURGE"
        private String description;
        private Instant detectedAt;
        private Double severity; // 0.0 - 1.0
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnnotatedImageInfo {
        private String cameraId;
        private String cameraName;
        private String imageUrl;
        private Instant timestamp;
        private Integer vehicleCount;
    }
}

