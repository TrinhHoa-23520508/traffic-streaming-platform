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

    private Integer countActiveCameras(List<TrafficMetric> data, @SuppressWarnings("unused") ReportJob job) {
        // Camera is ACTIVE if it sent ANY data during the report period
        // Since we query data within the report period, all cameras in data are active
        Set<String> activeCameras = data.stream()
                .map(TrafficMetric::getCameraId)
                .collect(Collectors.toSet());

        log.info("Active cameras: {} (cameras with data during report period)", activeCameras.size());
        return activeCameras.size();
    }

    private Integer countOfflineCameras(@SuppressWarnings("unused") List<TrafficMetric> data, @SuppressWarnings("unused") ReportJob job) {
        // Offline cameras = cameras that sent NO data during report period
        // Since we only query data from the report period, if a camera is in the data,
        // it means it sent at least some data, so it's NOT offline
        // In this implementation, all cameras in data are considered active
        // To properly detect offline cameras, we'd need a camera registry

        // For now, return 0 since all cameras that appear in data are active
        return 0;
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

    private List<CameraAnalysis> analyzeByCamera(List<TrafficMetric> data, @SuppressWarnings("unused") ReportJob job) {
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
                    double avgVehicles = (double) totalVehicles / metrics.size();

                    // Camera is ACTIVE because it has data in the result set
                    boolean isActive = true;

                    // Detect anomaly - only based on traffic volume
                    boolean hasAnomaly = false;
                    String anomalyType = null;

                    if (avgVehicles > systemAvg * 2.0) {
                        anomalyType = "SURGE";
                        hasAnomaly = true;
                    } else if (avgVehicles < systemAvg * 0.3 && avgVehicles > 0) {
                        anomalyType = "DROP";
                        hasAnomaly = true;
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
                            details.forEach((type, count) ->
                                byVehicleType.merge(type, count.longValue(), Long::sum)
                            );
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
                details.forEach((type, count) ->
                    counts.merge(type, count.longValue(), Long::sum)
                );
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

    private List<String> findOfflineCameras(@SuppressWarnings("unused") List<TrafficMetric> data, @SuppressWarnings("unused") ReportJob job) {
        // Since we only have data from cameras that sent data during report period,
        // all cameras in the data are by definition ACTIVE (not offline)
        // To detect offline cameras, we would need a camera registry to compare against
        // For now, return empty list - no offline cameras in the data set
        log.info("No offline cameras - all cameras in data sent information during report period");
        return new ArrayList<>();
    }

    private List<AnomalyEvent> detectAnomalies(List<TrafficMetric> data, @SuppressWarnings("unused") ReportJob job) {
        List<AnomalyEvent> anomalies = new ArrayList<>();
        double systemAvg = calculateAvgVehiclesPerCamera(data);

        Map<String, List<TrafficMetric>> byCamera = data.stream()
                .collect(Collectors.groupingBy(TrafficMetric::getCameraId));

        byCamera.forEach((cameraId, metrics) -> {
            TrafficMetric sample = metrics.get(0);
            long totalVehicles = metrics.stream().mapToLong(TrafficMetric::getTotalCount).sum();
            double avgVehicles = (double) totalVehicles / metrics.size();

            // Traffic surge - chỉ detect nếu lưu lượng cao hơn 100% so với trung bình
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

            // Traffic drop - chỉ detect nếu lưu lượng thấp hơn 70% so với trung bình
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

            // NOTE: OFFLINE detection removed completely
            // Cameras in the data set are by definition ACTIVE (not offline)
            // They sent data during the report period
        });

        return anomalies.stream()
                .sorted(Comparator.comparing(AnomalyEvent::getSeverity).reversed())
                .collect(Collectors.toList());
    }

    // ========== VIII. MINH HỌA ==========

    private List<AnnotatedImageInfo> collectAnnotatedImages(List<TrafficMetric> data) {
        // Get top 12 images from different cameras with highest vehicle counts
        Map<String, TrafficMetric> topMetricsByCamera = new HashMap<>();

        log.info("Collecting annotated images from {} traffic metrics", data.size());

        data.forEach(metric -> {
            if (metric.getAnnotatedImageUrl() != null && !metric.getAnnotatedImageUrl().isEmpty()) {
                topMetricsByCamera.merge(metric.getCameraId(), metric,
                        (existing, newMetric) ->
                                newMetric.getTotalCount() > existing.getTotalCount() ? newMetric : existing
                );
            }
        });

        log.info("Found {} cameras with annotated images", topMetricsByCamera.size());

        List<AnnotatedImageInfo> result = topMetricsByCamera.values().stream()
                .sorted(Comparator.comparing(TrafficMetric::getTotalCount).reversed())
                .limit(12)
                .map(m -> {
                    log.debug("Adding annotated image - Camera: {}, URL: {}, Vehicles: {}",
                        m.getCameraId(), m.getAnnotatedImageUrl(), m.getTotalCount());
                    return AnnotatedImageInfo.builder()
                            .cameraId(m.getCameraId())
                            .cameraName(m.getCameraName())
                            .imageUrl(m.getAnnotatedImageUrl())
                            .timestamp(m.getTimestamp())
                            .vehicleCount(m.getTotalCount())
                            .build();
                })
                .collect(Collectors.toList());

        log.info("Collected {} annotated images for report", result.size());
        return result;
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

        // 2. Quận đông nhất (nếu có dữ liệu)
        if (totalVehicles > 0) {
            String busiestDistrict = findBusiestDistrict(data);
            List<DistrictAnalysis> districts = analyzeByDistrict(data);
            districts.stream()
                    .filter(d -> d.getDistrictName().equals(busiestDistrict))
                    .findFirst()
                    .ifPresent(d -> {
                        if (d.getPercentage() > 40) {
                            conclusions.add(String.format(
                                    "%s là khu vực có lưu lượng cao nhất với %,d phương tiện (%.1f%% tổng lưu lượng). Đề xuất tăng cường giám sát và tối ưu phân luồng.",
                                    d.getDistrictName(), d.getTotalVehicles(), d.getPercentage()));
                        } else {
                            conclusions.add(String.format(
                                    "%s là khu vực có lưu lượng cao nhất với %,d phương tiện (%.1f%% tổng lưu lượng). Lưu lượng phân bố tương đối đồng đều.",
                                    d.getDistrictName(), d.getTotalVehicles(), d.getPercentage()));
                        }
                    });
        }

        // 3. Giờ cao điểm (chỉ khi có nhiều mẫu dữ liệu)
        Instant peakHour = findPeakHour(data);
        Long peakVolume = findPeakHourVolume(data);
        Instant offPeakHour = findOffPeakHour(data);

        if (peakHour != null && !peakHour.equals(offPeakHour)) {
            conclusions.add(String.format("Giờ cao điểm vào lúc %s với %,d phương tiện. Khuyến nghị tăng cường điều phối giao thông vào khung giờ này.",
                    formatInstant(peakHour), peakVolume));
        }

        // 4. Loại phương tiện
        Map<String, Long> vehicleTypes = calculateVehicleTypeCounts(data);
        if (!vehicleTypes.isEmpty()) {
            vehicleTypes.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .ifPresent(entry -> {
                        double percentage = (entry.getValue() * 100.0) / totalVehicles;
                        conclusions.add(String.format("Loại phương tiện phổ biến nhất là %s với %.1f%% tổng lưu lượng.",
                                entry.getKey(), percentage));
                    });
        }

        // 5. Hiệu suất hệ thống - ĐÁNH GIÁ THỰC TẾ
        double avgPerCamera = calculateAvgVehiclesPerCamera(data);
        String systemStatus;

        if (avgPerCamera > 2000) {
            systemStatus = "đang hoạt động ở mức tải cao";
        } else if (avgPerCamera > 1000) {
            systemStatus = "đang hoạt động ổn định";
        } else if (avgPerCamera > 500) {
            systemStatus = "đang hoạt động bình thường";
        } else if (avgPerCamera > 100) {
            systemStatus = "đang hoạt động với lưu lượng thấp";
        } else {
            systemStatus = "ghi nhận lưu lượng rất thấp - cần kiểm tra";
        }

        conclusions.add(String.format("Trung bình mỗi camera ghi nhận %.0f phương tiện. Hệ thống %s.",
                avgPerCamera, systemStatus));

        // 6. Bất thường (nếu có)
        List<AnomalyEvent> anomalies = detectAnomalies(data, job);
        if (!anomalies.isEmpty()) {
            long surgeCount = anomalies.stream().filter(a -> "TRAFFIC_SURGE".equals(a.getType())).count();
            long dropCount = anomalies.stream().filter(a -> "TRAFFIC_DROP".equals(a.getType())).count();

            if (surgeCount > 0) {
                conclusions.add(String.format("Phát hiện %d camera có lưu lượng tăng đột biến. Cần theo dõi để phát hiện ùn tắc.",
                        surgeCount));
            }
            if (dropCount > 0) {
                conclusions.add(String.format("Phát hiện %d camera có lưu lượng giảm bất thường. Kiểm tra xem có sự cố hay không.",
                        dropCount));
            }
        }

        return conclusions;
    }

    private String formatInstant(Instant instant) {
        // Format to Vietnam timezone (UTC+7)
        return instant.atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
                .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
    }
}

