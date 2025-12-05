package com.traffic_stream.dashboard.dto;


import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ReportNotifyDTO {
    private Long reportId;
    private String status;
    private String fileUrl;
}

