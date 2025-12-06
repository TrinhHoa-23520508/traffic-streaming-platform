package com.traffic_stream.dashboard.dto.report;

import com.traffic_stream.dashboard.shared.constant.ReportJobStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Schema(description = "Response khi tạo báo cáo thành công")
@Data
@Builder
public class CreateReportResponse {

    @Schema(description = "ID của báo cáo", example = "123", required = true)
    private Long id;

    @Schema(description = "Tên báo cáo", example = "Báo cáo giao thông tuần 1", required = true)
    private String name;

    @Schema(description = "Trạng thái hiện tại của báo cáo",
            required = true,
            implementation = ReportJobStatus.class)
    private ReportJobStatus status;

    @Schema(description = "Thời gian tạo báo cáo (ISO 8601)",
            example = "2025-12-02T10:30:00Z",
            type = "string",
            format = "date-time")
    private Instant createdAt;

    @Schema(description = "Thời gian dự kiến thực thi (ISO 8601). Null nếu thực thi ngay",
            example = "2025-12-03T01:00:00Z",
            type = "string",
            format = "date-time")
    private Instant executeAt;

}
