package com.traffic_stream.dashboard.service.scheduler;

import com.traffic_stream.dashboard.entity.ReportJob;
import com.traffic_stream.dashboard.repository.ReportJobRepository;
import com.traffic_stream.dashboard.service.ReportOrchestratorService;
import com.traffic_stream.dashboard.shared.constant.ReportJobStatus;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.ThreadPoolExecutor;

@Component
@Slf4j
public class ReportScheduler {

    private final ReportJobRepository repo;
    private final ReportOrchestratorService orchestrator;
    private final ThreadPoolTaskExecutor taskExecutor;

    public ReportScheduler(ReportJobRepository repo,
                           ReportOrchestratorService orchestrator) {
        this.repo = repo;
        this.orchestrator = orchestrator;

        // Config thread pool
        this.taskExecutor = new ThreadPoolTaskExecutor();
        this.taskExecutor.setCorePoolSize(5);
        this.taskExecutor.setMaxPoolSize(10);
        this.taskExecutor.setQueueCapacity(100);
        this.taskExecutor.setThreadNamePrefix("report-worker-");
        this.taskExecutor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        this.taskExecutor.initialize();
    }

    @Scheduled(fixedDelay = 60000)
    public void processReportJobs() {
        Instant now = Instant.now();
        List<ReportJob> jobs = repo.findExecutableJobs(now);

        log.info("Found {} jobs to process", jobs.size());

        for (ReportJob job : jobs) {
            // Submit to thread pool → non-blocking
            taskExecutor.submit(() -> processJob(job));
        }
    }

    @Transactional
    public void processJob(ReportJob job) {
        log.info("Processing job ID: {}", job.getId());

        job = repo.findById(job.getId())
                .orElseThrow();

        // Skip if already running/completed
        if (job.getStatus() != ReportJobStatus.PENDING) {
            log.warn("Job {} already {}", job.getId(), job.getStatus());
            return;
        }

        job.setStatus(ReportJobStatus.RUNNING);
        repo.save(job);

        try {
            orchestrator.process(job);
            log.info("Job {} completed", job.getId());
        } catch (Exception ex) {
            log.error("Job {} failed: {}", job.getId(), ex.getMessage(), ex);
            job.setStatus(ReportJobStatus.FAILED);
            repo.saveAndFlush(job);
        }
    }

    @PreDestroy
    public void shutdown() {
        taskExecutor.shutdown();
    }
}


