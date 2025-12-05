package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.dto.ReportSummaryDTO;
import com.traffic_stream.dashboard.entity.ReportJob;
import com.traffic_stream.dashboard.entity.TrafficMetric;
import com.traffic_stream.dashboard.repository.TrafficMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportDataAggregator {

    private TrafficMetricRepository trafficMetricRepository;

    private static final DateTimeFormatter HOUR_FORMATTER =
            DateTimeFormatter.ofPattern("HH:00").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    public List<ReportSummaryDTO> aggregateData(ReportJob job) {
        try {
            log.info("Aggregating data for job {}", job.getId());

            // Get raw data
            List<TrafficMetric> rawData = fetchRawData(job);

            if (rawData.isEmpty()) {
                log.warn("No data found for job {}", job.getId());
                throw new RuntimeException("Khong co du lieu trong khoang thoi gian nay");
            }

            log.info("Found {} traffic records for job {}", rawData.size(), job.getId());

            // Group by district
            Map<String, List<TrafficMetric>> byDistrict = rawData.stream()
                    .collect(Collectors.groupingBy(TrafficMetric::getDistrict));

            // Create summary for each district
            List<ReportSummaryDTO> summaries = byDistrict.entrySet().stream()
                    .map(entry -> createDistrictSummary(entry.getKey(), entry.getValue()))
                    .sorted(Comparator.comparing(ReportSummaryDTO::getDistrict))
                    .collect(Collectors.toList());

            log.info("Generated {} district summaries", summaries.size());
            return summaries;

        } catch (Exception e) {
            log.error("Failed to aggregate data for job {}: {}", job.getId(), e.getMessage());
            throw new RuntimeException("Loi khi tong hop du lieu: " + e.getMessage());
        }
    }

    private List<TrafficMetric> fetchRawData(ReportJob job) {
        List<String> districts = job.getDistricts();
        List<String> cameras = job.getCameras();

        if (cameras != null && !cameras.isEmpty()) {
            log.info("Fetching data by cameras: {}", cameras);
            return trafficMetricRepository.findByCameraIdInAndTimestampBetween(
                    cameras, job.getStartTime(), job.getEndTime()
            );
        } else if (districts != null && !districts.isEmpty()) {
            log.info("Fetching data by districts: {}", districts);
            return trafficMetricRepository.findByDistrictInAndTimestampBetween(
                    districts, job.getStartTime(), job.getEndTime()
            );
        } else {
            log.info("Fetching all data");
            return trafficMetricRepository.findByTimestampBetween(
                    job.getStartTime(), job.getEndTime()
            );
        }
    }

    private ReportSummaryDTO createDistrictSummary(String district, List<TrafficMetric> metrics) {
        log.debug("Creating summary for district: {}", district);

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

        log.debug("District {} summary: {} vehicles, peak at {}, {} top cameras",
                district, totalVehicles, peakHour, topCameras.size());

        return summary;
    }
}

