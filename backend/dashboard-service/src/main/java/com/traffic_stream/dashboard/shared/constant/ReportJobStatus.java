package com.traffic_stream.dashboard.shared.constant;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Trạng thái của job tạo báo cáo giao thông.
 * Flow: PENDING → RUNNING → COMPLETED/FAILED
 */
@Schema(description = "Trạng thái job báo cáo",
        enumAsRef = true,
        example = "PENDING")
public enum ReportJobStatus {

    @Schema(description = "Chờ xử lý - Job đã được tạo và đang chờ đến thời gian thực thi (executeAt)")
    PENDING,

    @Schema(description = "Đang xử lý - Job đang thu thập dữ liệu, tạo PDF và upload lên MinIO")
    RUNNING,

    @Schema(description = "Hoàn thành - Job đã tạo PDF thành công, có thể download từ fileUrl")
    COMPLETED,

    @Schema(description = "Thất bại - Job gặp lỗi trong quá trình xử lý, xem chi tiết tại errorMessage")
    FAILED;

    public boolean isTerminal() {
        return this == COMPLETED || this == FAILED;
    }

    public String getDescription() {
        switch (this) {
            case PENDING: return "Chờ xử lý";
            case RUNNING: return "Đang xử lý";
            case COMPLETED: return "Hoàn thành";
            case FAILED: return "Thất bại";
            default: return "Không xác định";
        }
    }
}
