package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.config.MinioBucketProperties;
import com.traffic_stream.dashboard.dto.report.ReportNotifyDTO;
import com.traffic_stream.dashboard.dto.report.ReportSummaryDTO;
import com.traffic_stream.dashboard.entity.ReportJob;
import com.traffic_stream.dashboard.repository.ReportJobRepository;
import com.traffic_stream.dashboard.service.storage.MinioStorageService;
import com.traffic_stream.dashboard.shared.constant.ReportJobStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.List;

@Service
@Slf4j
public class ReportOrchestratorService {

    private final TrafficMetricAggregationService aggregationService;
    private final PdfReportService pdfService;
    private final MinioStorageService minioService;
    private final ReportJobRepository repo;
    private final SimpMessagingTemplate ws;
    private final MinioBucketProperties minioBucketProperties;

    public ReportOrchestratorService(TrafficMetricAggregationService aggregationService,
                                     PdfReportService pdfService,
                                     MinioStorageService minioService,
                                     ReportJobRepository repo,
                                     SimpMessagingTemplate ws,
                                     MinioBucketProperties minioBucketProperties) {
        this.aggregationService = aggregationService;
        this.pdfService = pdfService;
        this.minioService = minioService;
        this.repo = repo;
        this.ws = ws;
        this.minioBucketProperties = minioBucketProperties;
    }

    public void process(ReportJob job) throws Exception {
        log.info("Starting orchestration for job {}", job.getId());


        List<ReportSummaryDTO> summaries = aggregationService.aggregateData(job);

        File pdf = pdfService.generatePdfReport(job, summaries);

        String objectPath = minioService.uploadReportFile(pdf, job, minioBucketProperties.getDocuments());

        job.setFileUrl(objectPath);
        job.setStatus(ReportJobStatus.COMPLETED);
        repo.save(job);

        ReportNotifyDTO notify = new ReportNotifyDTO(job.getId(), job.getStatus(), "/api/reports/download/" + job.getId() );
        ws.convertAndSend("/topic/report/" , notify);
        log.info("WebSocket notification sent for job {}", job.getId());

        try {
            if (pdf.delete()) {
                log.info("Temp file deleted successfully");
            } else {
                log.warn("Failed to delete temp file: {}", pdf.getAbsolutePath());
            }
        } catch (Exception e) {
            log.warn("Error deleting temp file: {}", e.getMessage());
        }

        log.info("Orchestration completed successfully for job {}", job.getId());
    }
}
