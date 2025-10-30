package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.entity.TrafficMetric;
import com.traffic_stream.dashboard.repository.TrafficMetricRepository;
import org.springframework.stereotype.Service;

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

    // Đặt múi giờ Việt Nam
    private final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final String VIETNAM_TZ_NAME = "Asia/Ho_Chi_Minh";

    public TrafficService(TrafficMetricRepository repository) {
        this.repository = repository;
    }

    /**
     * API 1: Lấy 100 bản ghi mới nhất (có thể lọc theo quận)
     */
    public List<TrafficMetric> getLatestTrafficMetrics(String district) {
        if (district != null && !district.isEmpty()) {
            return repository.findFirst100ByDistrictOrderByTimestampDesc(district);
        }
        return repository.findFirst100ByOrderByTimestampDesc();
    }

    /**
     * API 2: Lấy dữ liệu tổng hợp theo quận (có lọc theo ngày)
     */
    public Map<String, Long> getDistrictSummary(String dateStr) {
        LocalDate date = parseDateOrDefault(dateStr);
        Instant startOfDay = date.atStartOfDay(VIETNAM_ZONE).toInstant();
        Instant endOfDay = date.plusDays(1).atStartOfDay(VIETNAM_ZONE).toInstant();
        List<Object[]> results = repository.getTrafficSummaryByDistrictAndDate(startOfDay, endOfDay);
        Map<String, Long> summary = new HashMap<>();
        for (Object[] result : results) {
            String district = (String) result[0];
            Long total = (Long) result[1];
            summary.put(district, total);
        }
        return summary;
    }

    /**
     * API 3 (MỚI - CHO HEATMAP): Lấy tất cả metrics theo ngày và quận
     */
    public List<TrafficMetric> getMetricsByDate(String dateStr, String district) {
        LocalDate date = parseDateOrDefault(dateStr);
        Instant startOfDay = date.atStartOfDay(VIETNAM_ZONE).toInstant();
        Instant endOfDay = date.plusDays(1).atStartOfDay(VIETNAM_ZONE).toInstant();

        if (district != null && !district.isEmpty()) {
            return repository.findByTimestampBetweenAndDistrict(startOfDay, endOfDay, district);
        }
        return repository.findByTimestampBetween(startOfDay, endOfDay);
    }

    /**
     * API 4 (MỚI - CHO CHART 24H): Lấy summary theo giờ
     */
    public Map<Integer, Long> getHourlySummary(String dateStr, String district) {
        LocalDate date = parseDateOrDefault(dateStr);
        Instant startOfDay = date.atStartOfDay(VIETNAM_ZONE).toInstant();
        Instant endOfDay = date.plusDays(1).atStartOfDay(VIETNAM_ZONE).toInstant();

        List<Object[]> results = repository.getHourlySummary(startOfDay, endOfDay, district, VIETNAM_TZ_NAME);

        Map<Integer, Long> hourlySummary = IntStream.range(0, 24)
                .boxed()
                .collect(Collectors.toMap(hour -> hour, hour -> 0L));

        for (Object[] result : results) {
            Number hourNumber = (Number) result[0];
            int hour = hourNumber.intValue();
            Long total = ((Number) result[1]).longValue(); 
            hourlySummary.put(hour, total);
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
}