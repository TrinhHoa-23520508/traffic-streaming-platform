package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.config.MinioBucketProperties;
import com.traffic_stream.dashboard.dto.ReportNotifyDTO;
import com.traffic_stream.dashboard.dto.ReportSummaryDTO;
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

        // 1. collect aggregated data
        log.info("Step 1: Collecting aggregated data for job {}", job.getId());
        List<ReportSummaryDTO> summaries = aggregationService.aggregateData(job);
        log.info("Collected {} district summaries for job {}", summaries.size(), job.getId());

        // 2. generate PDF file locally
        log.info("Step 2: Generating PDF report for job {}", job.getId());
        File pdf = pdfService.generatePdfReport(job, summaries);
        log.info("Generated PDF file: {} (size: {} bytes)", pdf.getAbsolutePath(), pdf.length());

        // 3. upload to minio
        log.info("Step 3: Uploading PDF to MinIO for job {}", job.getId());
        String objectPath = minioService.uploadReportFile(pdf, job, minioBucketProperties.getDocuments());
        log.info("Uploaded to MinIO: {}", objectPath);

        // 4. update job
        log.info("Step 4: Updating job status to COMPLETED");
        job.setFileUrl(objectPath);
        job.setStatus(ReportJobStatus.COMPLETED);
        repo.save(job);
        log.info("Job {} updated successfully", job.getId());

        // 5. notify via websocket
        log.info("Step 5: Sending WebSocket notification for job {}", job.getId());
        ReportNotifyDTO notify = new ReportNotifyDTO(job.getId(), "COMPLETED", "/api/reports/" + job.getId() + "/download");
        ws.convertAndSend("/topic/report/" , notify);
        log.info("WebSocket notification sent for job {}", job.getId());

        // 6. delete local temp file
        log.info("Step 6: Cleaning up temp file");
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
