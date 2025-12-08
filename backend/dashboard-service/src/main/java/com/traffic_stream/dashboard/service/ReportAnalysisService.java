package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.dto.report.ReportAnalysisDTO;
import com.traffic_stream.dashboard.dto.report.ReportAnalysisDTO.*;
import com.traffic_stream.dashboard.entity.ReportJob;
import com.traffic_stream.dashboard.entity.TrafficMetric;
import com.traffic_stream.dashboard.repository.TrafficMetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service phân tích toàn diện dữ liệu giao thông cho báo cáo
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReportAnalysisService {

    private final TrafficMetricRepository trafficMetricRepository;

    /**
     * Phân tích toàn bộ dữ liệu cho một report job
     */
    public ReportAnalysisDTO analyzeData(ReportJob job) {
        log.info("Starting comprehensive analysis for job {}", job.getId());

        List<TrafficMetric> rawData = fetchRawData(job);

        if (rawData.isEmpty()) {
            throw new RuntimeException("Không có dữ liệu trong khoảng thời gian này");
        }

        log.info("Analyzing {} traffic records", rawData.size());

        return ReportAnalysisDTO.builder()
                // I. Thông tin báo cáo
                .reportTitle(job.getName() != null ? job.getName() : "Báo cáo giao thông")
                .startTime(job.getStartTime())
                .endTime(job.getEndTime())
                .intervalMinutes(job.getIntervalMinutes())
                .totalCameras(countTotalCameras(rawData))
                .activeCameras(countActiveCameras(rawData, job))
                .offlineCameras(countOfflineCameras(rawData, job))

                // II. Tổng hợp hệ thống
                .totalVehicles(calculateTotalVehicles(rawData))
                .avgVehiclesPerCamera(calculateAvgVehiclesPerCamera(rawData))
                .vehicleTypePercentages(calculateVehicleTypePercentages(rawData))
                .busiestDistrict(findBusiestDistrict(rawData))
                .quietestDistrict(findQuietestDistrict(rawData))
                .busiestCamera(findBusiestCamera(rawData))
                .quietestCamera(findQuietestCamera(rawData))

                // III. Phân tích theo quận
                .districtAnalyses(analyzeByDistrict(rawData))

                // IV. Phân tích theo camera
                .cameraAnalyses(analyzeByCamera(rawData, job))

                // V. Phân tích theo thời gian
                .timelineData(analyzeTimeline(rawData, job.getIntervalMinutes()))
                .peakHour(findPeakHour(rawData))
                .peakHourVolume(findPeakHourVolume(rawData))
                .offPeakHour(findOffPeakHour(rawData))
                .offPeakHourVolume(findOffPeakHourVolume(rawData))

                // VI. Phân tích loại phương tiện
                .vehicleTypeCounts(calculateVehicleTypeCounts(rawData))

                // VII. Sự kiện bất thường
                .offlineCameraList(findOfflineCameras(rawData, job))
                .anomalies(detectAnomalies(rawData, job))

                // VIII. Minh họa
                .annotatedImages(collectAnnotatedImages(rawData))

                // IX. Kết luận & kiến nghị
                .conclusions(generateConclusions(rawData, job))

                .build();
    }

    private List<TrafficMetric> fetchRawData(ReportJob job) {
        List<String> cameras = job.getCameras();
        List<String> districts = job.getDistricts();

        if (cameras != null && !cameras.isEmpty()) {
            return trafficMetricRepository.findByCameraIdInAndTimestampBetween(
                    cameras, job.getStartTime(), job.getEndTime());
        } else if (districts != null && !districts.isEmpty()) {
            return trafficMetricRepository.findByDistrictInAndTimestampBetween(
                    districts, job.getStartTime(), job.getEndTime());
        } else {
            return trafficMetricRepository.findByTimestampBetween(
                    job.getStartTime(), job.getEndTime());
        }


    }

    // ========== I. THÔNG TIN BÁO CÁO ==========

    private Integer countTotalCameras(List<TrafficMetric> data) {
        return (int) data.stream()
                .map(TrafficMetric::getCameraId)
                .distinct()
                .count();
    }

    private Integer countActiveCameras(List<TrafficMetric> data, ReportJob job) {
        long threshold = job.getStartTime().plus(job.getIntervalMinutes() * 2L, ChronoUnit.MINUTES).toEpochMilli();

        return (int) data.stream()
                .filter(m -> m.getTimestamp().toEpochMilli() >= threshold)
                .map(TrafficMetric::getCameraId)
                .distinct()
                .count();
    }

    private Integer countOfflineCameras(List<TrafficMetric> data, ReportJob job) {
        return countTotalCameras(data) - countActiveCameras(data, job);
    }

    // ========== II. TỔNG HỢP HỆ THỐNG ==========

    private Long calculateTotalVehicles(List<TrafficMetric> data) {
        return data.stream()
                .mapToLong(TrafficMetric::getTotalCount)
                .sum();
    }

    private Double calculateAvgVehiclesPerCamera(List<TrafficMetric> data) {
        Map<String, Long> cameraVehicles = data.stream()
                .collect(Collectors.groupingBy(
                        TrafficMetric::getCameraId,
                        Collectors.summingLong(TrafficMetric::getTotalCount)
                ));

        if (cameraVehicles.isEmpty()) return 0.0;

        return cameraVehicles.values().stream()
                .mapToLong(Long::longValue)
                .average()
                .orElse(0.0);
    }

    private Map<String, Double> calculateVehicleTypePercentages(List<TrafficMetric> data) {
        Map<String, Long> counts = calculateVehicleTypeCounts(data);
        long total = counts.values().stream().mapToLong(Long::longValue).sum();

        if (total == 0) return Collections.emptyMap();

        return counts.entrySet().stream()
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        e -> (e.getValue() * 100.0) / total
                ));
    }

    private String findBusiestDistrict(List<TrafficMetric> data) {
        return data.stream()
                .collect(Collectors.groupingBy(
                        TrafficMetric::getDistrict,
                        Collectors.summingLong(TrafficMetric::getTotalCount)
                ))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");
    }

    private String findQuietestDistrict(List<TrafficMetric> data) {
        return data.stream()
                .collect(Collectors.groupingBy(
                        TrafficMetric::getDistrict,
                        Collectors.summingLong(TrafficMetric::getTotalCount)
                ))
                .entrySet().stream()
                .min(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");
    }

    private String findBusiestCamera(List<TrafficMetric> data) {
        return data.stream()
                .collect(Collectors.groupingBy(
                        TrafficMetric::getCameraId,
                        Collectors.summingLong(TrafficMetric::getTotalCount)
                ))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");
    }

    private String findQuietestCamera(List<TrafficMetric> data) {
        return data.stream()
                .collect(Collectors.groupingBy(
                        TrafficMetric::getCameraId,
                        Collectors.summingLong(TrafficMetric::getTotalCount)
                ))
                .entrySet().stream()
                .min(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse("N/A");
    }

    // ========== III. PHÂN TÍCH THEO QUẬN ==========

    private List<DistrictAnalysis> analyzeByDistrict(List<TrafficMetric> data) {
        Map<String, List<TrafficMetric>> byDistrict = data.stream()
                .collect(Collectors.groupingBy(TrafficMetric::getDistrict));

        long totalVehicles = calculateTotalVehicles(data);

        return byDistrict.entrySet().stream()
                .map(entry -> {
                    String district = entry.getKey();
                    List<TrafficMetric> metrics = entry.getValue();
                    long districtVehicles = metrics.stream()
                            .mapToLong(TrafficMetric::getTotalCount)
                            .sum();

                    int activeCameras = (int) metrics.stream()
                            .map(TrafficMetric::getCameraId)
                            .distinct()
                            .count();

                    return DistrictAnalysis.builder()
                            .districtName(district)
                            .totalVehicles(districtVehicles)
                            .percentage(totalVehicles > 0 ? (districtVehicles * 100.0) / totalVehicles : 0.0)
                            .activeCameras(activeCameras)
                            .avgVehiclesPerCamera(activeCameras > 0 ? (double) districtVehicles / activeCameras : 0.0)
                            .build();
                })
                .sorted(Comparator.comparing(DistrictAnalysis::getTotalVehicles).reversed())
                .collect(Collectors.toList());
    }

    // ========== IV. PHÂN TÍCH THEO CAMERA ==========

    private List<CameraAnalysis> analyzeByCamera(List<TrafficMetric> data, ReportJob job) {
        Map<String, List<TrafficMetric>> byCamera = data.stream()
                .collect(Collectors.groupingBy(TrafficMetric::getCameraId));

        // Calculate average per camera for anomaly detection
        double systemAvg = calculateAvgVehiclesPerCamera(data);

        return byCamera.entrySet().stream()
                .map(entry -> {
                    String cameraId = entry.getKey();
                    List<TrafficMetric> metrics = entry.getValue();

                    TrafficMetric sample = metrics.get(0);
                    long totalVehicles = metrics.stream()
                            .mapToLong(TrafficMetric::getTotalCount)
                            .sum();
                    double avgVehicles = metrics.isEmpty() ? 0.0 : (double) totalVehicles / metrics.size();

                    // Check if active (has data in last interval)
                    Instant lastDataTime = metrics.stream()
                            .map(TrafficMetric::getTimestamp)
                            .max(Instant::compareTo)
                            .orElse(job.getStartTime());

                    boolean isActive = ChronoUnit.MINUTES.between(lastDataTime, job.getEndTime())
                            <= job.getIntervalMinutes() * 2;

                    // Detect anomaly
                    boolean hasAnomaly = avgVehicles > systemAvg * 2.0 || avgVehicles < systemAvg * 0.3;
                    String anomalyType = null;
                    if (!isActive) {
                        anomalyType = "OFFLINE";
                    } else if (avgVehicles > systemAvg * 2.0) {
                        anomalyType = "SURGE";
                    } else if (avgVehicles < systemAvg * 0.3 && avgVehicles > 0) {
                        anomalyType = "DROP";
                    }

                    return CameraAnalysis.builder()
                            .cameraId(cameraId)
                            .cameraName(sample.getCameraName())
                            .district(sample.getDistrict())
                            .totalVehicles(totalVehicles)
                            .avgVehicles(avgVehicles)
                            .isActive(isActive)
                            .hasAnomaly(hasAnomaly)
                            .anomalyType(anomalyType)
                            .build();
                })
                .sorted(Comparator.comparing(CameraAnalysis::getTotalVehicles).reversed())
                .collect(Collectors.toList());
    }

    // ========== V. PHÂN TÍCH THEO THỜI GIAN ==========

    private List<TimelineData> analyzeTimeline(List<TrafficMetric> data, int intervalMinutes) {
        // Group by time interval
        Map<Instant, List<TrafficMetric>> byInterval = data.stream()
                .collect(Collectors.groupingBy(m ->
                        roundToInterval(m.getTimestamp(), intervalMinutes)
                ));

        return byInterval.entrySet().stream()
                .map(entry -> {
                    Instant timestamp = entry.getKey();
                    List<TrafficMetric> metrics = entry.getValue();

                    long totalVehicles = metrics.stream()
                            .mapToLong(TrafficMetric::getTotalCount)
                            .sum();

                    Map<String, Long> byDistrict = metrics.stream()
                            .collect(Collectors.groupingBy(
                                    TrafficMetric::getDistrict,
                                    Collectors.summingLong(TrafficMetric::getTotalCount)
                            ));

                    Map<String, Long> byVehicleType = new HashMap<>();
                    metrics.forEach(m -> {
                        Map<String, Integer> details = m.getDetectionDetails();
                        if (details != null) {
                            details.forEach((type, count) -> {
                                byVehicleType.merge(type, count.longValue(), Long::sum);
                            });
                        }
                    });

                    return TimelineData.builder()
                            .timestamp(timestamp)
                            .totalVehicles(totalVehicles)
                            .byDistrict(byDistrict)
                            .byVehicleType(byVehicleType)
                            .build();
                })
                .sorted(Comparator.comparing(TimelineData::getTimestamp))
                .collect(Collectors.toList());
    }

    private Instant roundToInterval(Instant timestamp, int intervalMinutes) {
        long epochMilli = timestamp.toEpochMilli();
        long intervalMilli = intervalMinutes * 60L * 1000L;
        long rounded = (epochMilli / intervalMilli) * intervalMilli;
        return Instant.ofEpochMilli(rounded);
    }

    private Instant findPeakHour(List<TrafficMetric> data) {
        return data.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getTimestamp().truncatedTo(ChronoUnit.HOURS),
                        Collectors.summingLong(TrafficMetric::getTotalCount)
                ))
                .entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private Long findPeakHourVolume(List<TrafficMetric> data) {
        return data.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getTimestamp().truncatedTo(ChronoUnit.HOURS),
                        Collectors.summingLong(TrafficMetric::getTotalCount)
                ))
                .values().stream()
                .max(Long::compareTo)
                .orElse(0L);
    }

    private Instant findOffPeakHour(List<TrafficMetric> data) {
        return data.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getTimestamp().truncatedTo(ChronoUnit.HOURS),
                        Collectors.summingLong(TrafficMetric::getTotalCount)
                ))
                .entrySet().stream()
                .min(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private Long findOffPeakHourVolume(List<TrafficMetric> data) {
        return data.stream()
                .collect(Collectors.groupingBy(
                        m -> m.getTimestamp().truncatedTo(ChronoUnit.HOURS),
                        Collectors.summingLong(TrafficMetric::getTotalCount)
                ))
                .values().stream()
                .min(Long::compareTo)
                .orElse(0L);
    }

    // ========== VI. PHÂN TÍCH LOẠI PHƯƠNG TIỆN ==========

    private Map<String, Long> calculateVehicleTypeCounts(List<TrafficMetric> data) {
        Map<String, Long> counts = new HashMap<>();

        data.forEach(metric -> {
            Map<String, Integer> details = metric.getDetectionDetails();
            if (details != null) {
                details.forEach((type, count) -> {
                    counts.merge(type, count.longValue(), Long::sum);
                });
            }
        });

        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (e1, e2) -> e1,
                        LinkedHashMap::new
                ));
    }

    // ========== VII. SỰ KIỆN BẤT THƯỜNG ==========

    private List<String> findOfflineCameras(List<TrafficMetric> data, ReportJob job) {
        Set<String> allCameras = data.stream()
                .map(TrafficMetric::getCameraId)
                .collect(Collectors.toSet());

        Instant threshold = job.getEndTime().minus(job.getIntervalMinutes() * 2L, ChronoUnit.MINUTES);

        Set<String> activeCameras = data.stream()
                .filter(m -> m.getTimestamp().isAfter(threshold))
                .map(TrafficMetric::getCameraId)
                .collect(Collectors.toSet());

        allCameras.removeAll(activeCameras);
        return new ArrayList<>(allCameras);
    }

    private List<AnomalyEvent> detectAnomalies(List<TrafficMetric> data, ReportJob job) {
        List<AnomalyEvent> anomalies = new ArrayList<>();
        double systemAvg = calculateAvgVehiclesPerCamera(data);

        Map<String, List<TrafficMetric>> byCamera = data.stream()
                .collect(Collectors.groupingBy(TrafficMetric::getCameraId));

        byCamera.forEach((cameraId, metrics) -> {
            TrafficMetric sample = metrics.get(0);
            long totalVehicles = metrics.stream().mapToLong(TrafficMetric::getTotalCount).sum();
            double avgVehicles = (double) totalVehicles / metrics.size();

            // Traffic surge
            if (avgVehicles > systemAvg * 2.0) {
                anomalies.add(AnomalyEvent.builder()
                        .cameraId(cameraId)
                        .cameraName(sample.getCameraName())
                        .type("TRAFFIC_SURGE")
                        .description(String.format("Lưu lượng tăng %.0f%% so với trung bình hệ thống",
                                ((avgVehicles / systemAvg) - 1) * 100))
                        .detectedAt(metrics.get(metrics.size() - 1).getTimestamp())
                        .severity(Math.min(1.0, avgVehicles / systemAvg / 3.0))
                        .build());
            }

            // Traffic drop
            if (avgVehicles < systemAvg * 0.3 && avgVehicles > 0) {
                anomalies.add(AnomalyEvent.builder()
                        .cameraId(cameraId)
                        .cameraName(sample.getCameraName())
                        .type("TRAFFIC_DROP")
                        .description(String.format("Lưu lượng giảm %.0f%% so với trung bình hệ thống",
                                (1 - avgVehicles / systemAvg) * 100))
                        .detectedAt(metrics.get(metrics.size() - 1).getTimestamp())
                        .severity(Math.min(1.0, (systemAvg - avgVehicles) / systemAvg))
                        .build());
            }

            // Offline camera
            Instant lastDataTime = metrics.stream()
                    .map(TrafficMetric::getTimestamp)
                    .max(Instant::compareTo)
                    .orElse(job.getStartTime());

            if (ChronoUnit.MINUTES.between(lastDataTime, job.getEndTime()) > job.getIntervalMinutes() * 2) {
                anomalies.add(AnomalyEvent.builder()
                        .cameraId(cameraId)
                        .cameraName(sample.getCameraName())
                        .type("OFFLINE")
                        .description(String.format("Camera không gửi dữ liệu trong %d phút",
                                ChronoUnit.MINUTES.between(lastDataTime, job.getEndTime())))
                        .detectedAt(lastDataTime)
                        .severity(1.0)
                        .build());
            }
        });

        return anomalies.stream()
                .sorted(Comparator.comparing(AnomalyEvent::getSeverity).reversed())
                .collect(Collectors.toList());
    }

    // ========== VIII. MINH HỌA ==========

    private List<AnnotatedImageInfo> collectAnnotatedImages(List<TrafficMetric> data) {
        // Get top 12 images from different cameras with highest vehicle counts
        Map<String, TrafficMetric> topMetricsByCamera = new HashMap<>();

        data.forEach(metric -> {
            if (metric.getAnnotatedImageUrl() != null && !metric.getAnnotatedImageUrl().isEmpty()) {
                topMetricsByCamera.merge(metric.getCameraId(), metric,
                        (existing, newMetric) ->
                                newMetric.getTotalCount() > existing.getTotalCount() ? newMetric : existing
                );
            }
        });

        return topMetricsByCamera.values().stream()
                .sorted(Comparator.comparing(TrafficMetric::getTotalCount).reversed())
                .limit(12)
                .map(m -> AnnotatedImageInfo.builder()
                        .cameraId(m.getCameraId())
                        .cameraName(m.getCameraName())
                        .imageUrl(m.getAnnotatedImageUrl())
                        .timestamp(m.getTimestamp())
                        .vehicleCount(m.getTotalCount())
                        .build())
                .collect(Collectors.toList());
    }

    // ========== IX. KẾT LUẬN & KIẾN NGHỊ ==========

    private List<String> generateConclusions(List<TrafficMetric> data, ReportJob job) {
        List<String> conclusions = new ArrayList<>();

        // 1. Tổng quan
        long totalVehicles = calculateTotalVehicles(data);
        conclusions.add(String.format("Tổng cộng %,d phương tiện được ghi nhận trong khoảng thời gian từ %s đến %s.",
                totalVehicles,
                formatInstant(job.getStartTime()),
                formatInstant(job.getEndTime())));

        // 2. Quận đông nhất
        String busiestDistrict = findBusiestDistrict(data);
        List<DistrictAnalysis> districts = analyzeByDistrict(data);
        districts.stream()
                .filter(d -> d.getDistrictName().equals(busiestDistrict))
                .findFirst()
                .ifPresent(d -> conclusions.add(String.format(
                        "%s là khu vực có lưu lượng cao nhất với %,d phương tiện (%.1f%% tổng lưu lượng). Đề xuất tăng cường giám sát và tối ưu phân luồng.",
                        d.getDistrictName(), d.getTotalVehicles(), d.getPercentage()
                )));

        // 3. Giờ cao điểm
        Instant peakHour = findPeakHour(data);
        Long peakVolume = findPeakHourVolume(data);
        if (peakHour != null) {
            conclusions.add(String.format("Giờ cao điểm vào lúc %s với %,d phương tiện. Khuyến nghị tăng cường điều phối giao thông vào khung giờ này.",
                    formatInstant(peakHour), peakVolume));
        }

        // 4. Camera offline
        List<String> offlineCameras = findOfflineCameras(data, job);
        if (!offlineCameras.isEmpty()) {
            conclusions.add(String.format("Phát hiện %d camera không hoạt động: %s. Cần kiểm tra và bảo trì thiết bị ngay.",
                    offlineCameras.size(),
                    offlineCameras.stream().limit(5).collect(Collectors.joining(", "))));
        }

        // 5. Bất thường lưu lượng
        List<AnomalyEvent> anomalies = detectAnomalies(data, job);
        long surges = anomalies.stream().filter(a -> "TRAFFIC_SURGE".equals(a.getType())).count();
        if (surges > 0) {
            conclusions.add(String.format("Phát hiện %d điểm có lưu lượng tăng bất thường. Cần xem xét nguyên nhân và điều chỉnh kế hoạch phân luồng.",
                    surges));
        }

        // 6. Loại phương tiện
        Map<String, Long> vehicleTypes = calculateVehicleTypeCounts(data);
        if (!vehicleTypes.isEmpty()) {
            Map.Entry<String, Long> topType = vehicleTypes.entrySet().iterator().next();
            double percentage = (topType.getValue() * 100.0) / totalVehicles;
            conclusions.add(String.format("Loại phương tiện phổ biến nhất là %s với %.1f%% tổng lưu lượng.",
                    topType.getKey(), percentage));
        }

        // 7. Hiệu suất hệ thống
        double avgPerCamera = calculateAvgVehiclesPerCamera(data);
        conclusions.add(String.format("Trung bình mỗi camera ghi nhận %.0f phương tiện. Hệ thống đang hoạt động %s.",
                avgPerCamera,
                avgPerCamera > 1000 ? "ở mức tải cao" : avgPerCamera > 500 ? "ổn định" : "ở mức tải thấp"));

        return conclusions;
    }

    private String formatInstant(Instant instant) {
        return instant.toString().replace("T", " ").substring(0, 16);
    }
}

