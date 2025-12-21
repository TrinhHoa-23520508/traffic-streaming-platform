package com.traffic_stream.dashboard.shared.mapper;

import com.traffic_stream.dashboard.dto.report.CreateReportRequest;
import com.traffic_stream.dashboard.dto.report.CreateReportResponse;
import com.traffic_stream.dashboard.entity.ReportJob;
import com.traffic_stream.dashboard.shared.constant.ReportJobStatus;

import java.time.Instant;

public class ReportJobMapper {

    public static ReportJob toEntity(CreateReportRequest createReportRequest){
        return ReportJob.builder()
                .name(createReportRequest.getName())
                .startTime(createReportRequest.getStartTime())
                .endTime(createReportRequest.getEndTime())
                .intervalMinutes(createReportRequest.getIntervalMinutes())
                .districts(createReportRequest.getDistricts() == null ? null : createReportRequest.getDistricts())
                .cameras(createReportRequest.getCameras() == null ? null : createReportRequest.getCameras())
                .executeAt(createReportRequest.getExecuteAt() == null ? Instant.now() : createReportRequest.getExecuteAt())
                .fileUrl(null)
                .build();
    }

    public static CreateReportResponse toCreateReportResponse(ReportJob reportJob){
        return CreateReportResponse.builder()
                .id(reportJob.getId())
                .name(reportJob.getName())
                .status(reportJob.getStatus())
                .createdAt(reportJob.getCreatedAt())
                .executeAt(reportJob.getExecuteAt())
                .build();
    }
}
