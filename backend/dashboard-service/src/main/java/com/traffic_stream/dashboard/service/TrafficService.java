package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.entity.TrafficMetric;
import com.traffic_stream.dashboard.repository.TrafficMetricRepository;
import org.springframework.stereotype.Service;
import com.traffic_stream.dashboard.dto.HourlyDistrictSummaryDTO;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import com.traffic_stream.dashboard.dto.DistrictDailySummaryDTO;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
public class TrafficService {

    private final TrafficMetricRepository repository;

    private final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final String VIETNAM_TZ_NAME = "Asia/Ho_Chi_Minh";

    public TrafficService(TrafficMetricRepository repository) {
        this.repository = repository;
    }

    /**
     * API 1: Lấy 100 bản ghi mới nhất
     * - Nếu có date: Lấy 100 bản ghi mới nhất CỦA NGÀY ĐÓ.
     * - Nếu không có date: Lấy 100 bản ghi mới nhất TÍNH ĐẾN HIỆN TẠI (Real-time).
     */
    public List<TrafficMetric> getLatestTrafficMetrics(String district, String dateStr) {
        if (dateStr != null && !dateStr.isEmpty()) {
            LocalDate date = parseDateOrDefault(dateStr);
            Instant startOfDay = date.atStartOfDay(VIETNAM_ZONE).toInstant();
            Instant endOfDay = date.plusDays(1).atStartOfDay(VIETNAM_ZONE).toInstant();

            if (district != null && !district.isEmpty()) {
                return repository.findFirst100ByDistrictAndTimestampBetweenOrderByTimestampDesc(district, startOfDay, endOfDay);
            } else {
                return repository.findFirst100ByTimestampBetweenOrderByTimestampDesc(startOfDay, endOfDay);
            }
        }

        if (district != null && !district.isEmpty()) {
            return repository.findFirst100ByDistrictOrderByTimestampDesc(district);
        }
        return repository.findFirst100ByOrderByTimestampDesc();
    }

    /**
     * API 2: Lấy dữ liệu tổng hợp CHI TIẾT theo quận (có lọc theo ngày)
     */
    public Map<String, DistrictDailySummaryDTO> getDistrictSummary(String dateStr) {
        LocalDate date = parseDateOrDefault(dateStr);
        Instant startOfDay = date.atStartOfDay(VIETNAM_ZONE).toInstant();
        Instant endOfDay = date.plusDays(1).atStartOfDay(VIETNAM_ZONE).toInstant();

        List<TrafficMetric> metrics = repository.findByTimestampBetween(startOfDay, endOfDay);

        Map<String, DistrictDailySummaryDTO> summaryMap = new HashMap<>();

        for (TrafficMetric metric : metrics) {
            String district = metric.getDistrict();
            if (district == null || district.isEmpty()) {
                continue;
            }

            DistrictDailySummaryDTO summaryDTO = summaryMap.computeIfAbsent(
                    district,
                    d -> new DistrictDailySummaryDTO()
            );
            summaryDTO.addMetric(metric);
        }

        return summaryMap;
    }

    /**
     * API 3 : Lấy tất cả metrics theo ngày và camera
     */
    public List<TrafficMetric> getMetricsByDate(String dateStr, String cameraId) {
        LocalDate date = parseDateOrDefault(dateStr);
        Instant startOfDay = date.atStartOfDay(VIETNAM_ZONE).toInstant();
        Instant endOfDay = date.plusDays(1).atStartOfDay(VIETNAM_ZONE).toInstant();

        if (cameraId != null && !cameraId.isEmpty()) {
            return repository.findByTimestampBetweenAndCameraId(startOfDay, endOfDay, cameraId);
        }
        return repository.findByTimestampBetween(startOfDay, endOfDay);
    }

    /**
     * API 4 : Lấy summary theo giờ
     * (ĐÃ CẬP NHẬT: Tự tính lại total, BỎ QUA "person")
     */
    public Map<Integer, Long> getHourlySummary(String dateStr, String district) {
        LocalDate date = parseDateOrDefault(dateStr);
        Instant startOfDay = date.atStartOfDay(VIETNAM_ZONE).toInstant();
        Instant endOfDay = date.plusDays(1).atStartOfDay(VIETNAM_ZONE).toInstant();

        Map<Integer, Long> hourlySummary = IntStream.range(0, 24)
                .boxed()
                .collect(Collectors.toMap(hour -> hour, hour -> 0L));

        List<TrafficMetric> metrics = repository.findByTimestampBetween(startOfDay, endOfDay);

        for (TrafficMetric metric : metrics) {
            if (district != null && !district.isEmpty()) {
                if (!district.equals(metric.getDistrict())) {
                    continue;
                }
            }
            int hour = ZonedDateTime.ofInstant(metric.getTimestamp(), VIETNAM_ZONE).getHour();

            long cleanTotalForThisMetric = 0;
            if (metric.getDetectionDetails() != null) {
                for (Map.Entry<String, Integer> entry : metric.getDetectionDetails().entrySet()) {
                    if (!"person".equalsIgnoreCase(entry.getKey())) {
                        cleanTotalForThisMetric += entry.getValue();
                    }
                }
            }

            hourlySummary.merge(hour, cleanTotalForThisMetric, Long::sum);
        }

        return hourlySummary;
    }

    /**
     * Helper: Chuyển chuỗi YYYY-MM-DD sang LocalDate
     * Nếu chuỗi rỗng/null, mặc định là hôm nay (giờ Việt Nam)
     */
    private LocalDate parseDateOrDefault(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) {
            return LocalDate.now(VIETNAM_ZONE); 
        }
        return LocalDate.parse(dateStr); 
    }

    /** API 5
     * Lấy bản ghi metric mới nhất cho một camera cụ thể.
     * @param cameraId ID của camera
     * @return TrafficMetric mới nhất, hoặc null nếu không tìm thấy
     */
    public TrafficMetric getLatestMetricByCameraId(String cameraId) {
        return repository.findFirstByCameraIdOrderByTimestampDesc(cameraId)
                .orElse(null);
    }

    /**
     * HÀM dùng cho Scheduled Task
     * Tổng hợp chi tiết theo quận cho một khoảng thời gian (1 giờ)
     */
    public List<HourlyDistrictSummaryDTO> getDetailedHourlySummaryByDistrict(Instant startTime, Instant endTime) {
        List<TrafficMetric> metrics = repository.findByTimestampBetween(startTime, endTime);
        Map<String, HourlyDistrictSummaryDTO> summaryMap = new HashMap<>();
        int hour = ZonedDateTime.ofInstant(startTime, VIETNAM_ZONE).getHour();

        for (TrafficMetric metric : metrics) {
            String district = metric.getDistrict(); //
            if (district == null || district.isEmpty()) {
                continue;
            }
            HourlyDistrictSummaryDTO summaryDTO = summaryMap.computeIfAbsent(
                    district,
                    d -> new HourlyDistrictSummaryDTO(d, hour)
            );
            summaryDTO.addMetric(metric);
        }
        return new ArrayList<>(summaryMap.values());
    }

    public List<String> getAllDistricts() {
        return repository.findDistinctDistricts();
    }

    public List<Map<String, String>> getAllCameras(String district) {
        List<TrafficMetric> metrics;
        if (district != null && !district.trim().isEmpty()) {
            metrics = repository.findDistinctCamerasByDistrict(district);
        } else {
            metrics = repository.findDistinctCameras();
        }

        return metrics.stream()
                .map(m -> Map.of(
                        "cameraId", m.getCameraId(),
                        "cameraName", m.getCameraName(),
                        "district", m.getDistrict()
                ))
                .distinct()
                .toList();
    }

}