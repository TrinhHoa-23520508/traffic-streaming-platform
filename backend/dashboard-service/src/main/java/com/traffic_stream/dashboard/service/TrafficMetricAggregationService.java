package com.traffic_stream.dashboard.service;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.traffic_stream.dashboard.dto.ReportSummaryDTO;
import com.traffic_stream.dashboard.entity.ReportJob;
import com.traffic_stream.dashboard.entity.TrafficMetric;
import com.traffic_stream.dashboard.repository.TrafficMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrafficMetricAggregationService {

    private final TrafficMetricRepository trafficMetricRepository;

    private static final DateTimeFormatter HOUR_FORMATTER =
            DateTimeFormatter.ofPattern("HH:00").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    public List<ReportSummaryDTO> aggregateData(ReportJob job) {
        try {
            log.info("Starting data aggregation for job {}", job.getId());
            log.info("Time range: {} to {}", job.getStartTime(), job.getEndTime());

            // Parse filters
            List<String> districts = job.getDistricts();
            List<String> cameras = job.getCameras();

            log.info("Filters - Districts: {}, Cameras: {}",
                    districts != null ? districts.size() : 0,
                    cameras != null ? cameras.size() : 0);

            // Get raw data
            log.info("Fetching raw data from database...");
            List<TrafficMetric> rawData = fetchRawData(job, districts, cameras);
            log.info("Fetched {} traffic metrics", rawData.size());

            if (rawData.isEmpty()) {
                log.warn("No data found for job {} in the specified time range", job.getId());
                throw new RuntimeException("Không có dữ liệu trong khoảng thời gian này");
            }

            // Group by district
            log.info("Grouping data by district...");
            Map<String, List<TrafficMetric>> byDistrict = rawData.stream()
                    .collect(Collectors.groupingBy(TrafficMetric::getDistrict));
            log.info("Found {} districts in the data", byDistrict.size());

            // Create summary for each district
            List<ReportSummaryDTO> summaries = byDistrict.entrySet().stream()
                    .map(entry -> createDistrictSummary(entry.getKey(), entry.getValue()))
                    .sorted(Comparator.comparing(ReportSummaryDTO::getDistrict))
                    .collect(Collectors.toList());

            log.info("Successfully created {} district summaries", summaries.size());
            return summaries;

        } catch (Exception e) {
            log.error("Failed to aggregate data for job {}: {}", job.getId(), e.getMessage(), e);
            throw new RuntimeException("Lỗi khi tổng hợp dữ liệu: " + e.getMessage(), e);
        }
    }

    private List<TrafficMetric> fetchRawData(ReportJob job, List<String> districts, List<String> cameras) {
        if (cameras != null && !cameras.isEmpty()) {
            log.info("Querying by camera IDs: {}", cameras);
            return trafficMetricRepository.findByCameraIdInAndTimestampBetween(
                    cameras, job.getStartTime(), job.getEndTime()
            );
        } else if (districts != null && !districts.isEmpty()) {
            log.info("Querying by districts: {}", districts);
            return trafficMetricRepository.findByDistrictInAndTimestampBetween(
                    districts, job.getStartTime(), job.getEndTime()
            );
        } else {
            log.info("Querying all data without filters");
            return trafficMetricRepository.findByTimestampBetween(
                    job.getStartTime(), job.getEndTime()
            );
        }
    }

    private ReportSummaryDTO createDistrictSummary(String district, List<TrafficMetric> metrics) {
        ReportSummaryDTO summary = new ReportSummaryDTO();
        summary.setDistrict(district);

        // Total vehicles
        long totalVehicles = metrics.stream()
                .mapToLong(TrafficMetric::getTotalCount)
                .sum();
        summary.setTotalVehicles(totalVehicles);

        // Peak hour
        Map<String, Long> hourlyTraffic = metrics.stream()
                .collect(Collectors.groupingBy(
                        m -> HOUR_FORMATTER.format(m.getTimestamp()),
                        Collectors.summingLong(TrafficMetric::getTotalCount)
                ));

        String peakHour = hourlyTraffic.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");
        summary.setPeakHour(peakHour);

        // Top cameras
        List<String> topCameras = metrics.stream()
                .collect(Collectors.groupingBy(
                        TrafficMetric::getCameraName,
                        Collectors.summingLong(TrafficMetric::getTotalCount)
                ))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
        summary.setTopCameras(topCameras);

        return summary;
    }

}

