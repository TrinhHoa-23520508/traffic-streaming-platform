package com.traffic_stream.dashboard.dto.report;

import com.traffic_stream.dashboard.shared.constant.ReportJobStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
@Schema(description = "Report generation notification with download information")
public class ReportNotifyDTO {

    @Schema(description = "Unique identifier of the report", example = "12345")
    private Long reportId;

    @Schema(description = "Current status of the report generation job", example = "COMPLETED")
    private ReportJobStatus status;

    @Schema(description = "URL to download the generated report file", example = "https://storage.example.com/reports/traffic-report-2024-01.pdf")
    private String fileUrl;
}
