package com.traffic_stream.dashboard.dto.report;


import com.traffic_stream.dashboard.shared.constant.ReportJobStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ReportNotifyDTO {
    private Long reportId;
    private ReportJobStatus status;
    private String fileUrl;
}

