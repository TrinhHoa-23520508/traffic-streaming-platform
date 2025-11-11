package com.traffic_stream.dashboard.dto;

import com.traffic_stream.dashboard.entity.TrafficMetric;
import lombok.Data;
import java.util.HashMap;
import java.util.Map;

@Data
public class HourlyDistrictSummaryDTO {

    private String district;
    private int hour;
    private long totalCount = 0L;
    private Map<String, Long> detectionDetailsSummary;

    public HourlyDistrictSummaryDTO(String district, int hour) {
        this.district = district;
        this.hour = hour;
        this.detectionDetailsSummary = new HashMap<>();
    }

    /**
     * Hàm helper đã được CẬP NHẬT
     * - Tự tính lại totalCount (không bao gồm "person").
     * - Map các loại xe về 4 nhóm: car, motorcycle, truck, other.
     */
    public void addMetric(TrafficMetric metric) {
        if (metric.getDetectionDetails() == null) {
            return;
        }

        metric.getDetectionDetails().forEach((rawType, count) -> {
            String mappedType = mapVehicleType(rawType);

            if (mappedType != null) {
                this.totalCount += count;
                this.detectionDetailsSummary.merge(mappedType, count.longValue(), Long::sum);
            }
        });
    }

    /**
     * HÀM HELPER MỚI: Ánh xạ loại phương tiện
     * Trả về null nếu loại này cần bị bỏ qua (ví dụ: "person").
     */
    private String mapVehicleType(String rawType) {
        if (rawType == null) {
            return "other";
        }

        switch (rawType.toLowerCase()) {
            case "car":
                return "car";
            case "motorcycle":
                return "motorcycle";
            case "truck":
                return "truck";
            case "person":
                return null;
            case "bus":
            case "bicycle":
            case "train":
                return "other";
            default:
                return "other";
        }
    }
}