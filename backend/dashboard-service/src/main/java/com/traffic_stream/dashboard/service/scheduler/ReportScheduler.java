package com.traffic_stream.dashboard.service.scheduler;

import com.traffic_stream.dashboard.entity.ReportJob;
import com.traffic_stream.dashboard.repository.ReportJobRepository;
import com.traffic_stream.dashboard.service.ReportOrchestratorService;
import com.traffic_stream.dashboard.shared.constant.ReportJobStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Component
@Slf4j
public class ReportScheduler {

    private final ReportJobRepository repo;
    private final ReportOrchestratorService orchestrator;

    public ReportScheduler(ReportJobRepository repo, ReportOrchestratorService orchestrator) {
        this.repo = repo;
        this.orchestrator = orchestrator;
    }

    // run each minute
    @Scheduled(fixedDelay = 60000)
    @Async
    @Transactional
    public void processReportJobs() {
        Instant now = Instant.now();

        List<ReportJob> jobs = repo.findExecutableJobs(now);

        for (ReportJob job : jobs) {
            log.info("Processing job ID: {}, Name: {}, Status: {}", job.getId(), job.getName(), job.getStatus());

            // mark RUNNING first
            job.setStatus(ReportJobStatus.RUNNING);
            repo.save(job);
            log.info("Job {} marked as RUNNING", job.getId());

            try {
                orchestrator.process(job);
                log.info("Job {} completed successfully", job.getId());
            } catch (Exception ex) {
                log.error("Job {} failed with error: {}", job.getId(), ex.getMessage(), ex);
                job.setStatus(ReportJobStatus.FAILED);
                repo.save(job);
            }
        }

        log.info("Report job scheduler completed");
    }
}

