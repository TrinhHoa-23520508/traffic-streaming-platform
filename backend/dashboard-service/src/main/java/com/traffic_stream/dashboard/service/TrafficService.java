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
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;

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
     * API 2: Lấy dữ liệu tổng hợp CHI TIẾT theo quận
     * - Input: start, end (String).
     * - Logic:
     * + Nếu không truyền start: Mặc định từ 00:00 sáng nay (VN Time).
     * + Nếu không truyền end: Mặc định đến hiện tại (Real-time).
     * + Nếu start == end (User chọn cùng 1 ngày): Tự động lấy full 24h ngày đó.
     */
    public Map<String, DistrictDailySummaryDTO> getDistrictSummary(String startStr, String endStr) {
        Instant now = Instant.now();
        Instant startOfDay = LocalDate.now(VIETNAM_ZONE).atStartOfDay(VIETNAM_ZONE).toInstant();

        Instant start = (startStr != null && !startStr.isEmpty())
                ? parseToInstant(startStr, true)
                : startOfDay;

        Instant end;
        if (endStr != null && !endStr.isEmpty()) {
            end = parseToInstant(endStr, false);
            if (start.equals(end)) {
                end = end.plus(1, ChronoUnit.DAYS);
            }
        } else {
            end = now;
        }

        List<TrafficMetric> metrics = repository.findByTimestampBetween(start, end);

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
     * Yêu cầu:
     *      - Thêm start, end (Mặc định 24h qua).
     *      - Thêm filter cameraId.
     */
    public Map<String, Long> getHourlyTimeSeries(String startStr, String endStr, String district, String cameraId) {
        Instant now = Instant.now();
        Instant twentyFourHoursAgo = now.minus(24, ChronoUnit.HOURS);

        Instant end = (endStr != null && !endStr.isEmpty()) ? parseToInstant(endStr, false) : now;
        Instant start = (startStr != null && !startStr.isEmpty()) ? parseToInstant(startStr, true) : twentyFourHoursAgo;

        if (start.equals(end) && endStr != null) {
            end = end.plus(1, ChronoUnit.DAYS);
        }

        Map<String, Long> timeSeries = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:00:00");
        ZonedDateTime currentZdt = start.atZone(VIETNAM_ZONE).truncatedTo(ChronoUnit.HOURS);
        ZonedDateTime endZdt = end.atZone(VIETNAM_ZONE);

        int safety = 0;
        while (currentZdt.isBefore(endZdt) && safety < 1000) {
            timeSeries.put(formatter.format(currentZdt), 0L);
            currentZdt = currentZdt.plusHours(1);
            safety++;
        }

        if (cameraId != null && !cameraId.isEmpty()) {
            List<TrafficMetric> metrics = repository.findByTimestampBetweenAndCameraId(start, end, cameraId);
            for (TrafficMetric metric : metrics) {
                ZonedDateTime zdt = metric.getTimestamp().atZone(VIETNAM_ZONE).truncatedTo(ChronoUnit.HOURS);
                String key = formatter.format(zdt);

                long count = 0;
                if (metric.getDetectionDetails() != null) {
                    for (Map.Entry<String, Integer> e : metric.getDetectionDetails().entrySet()) {
                        if (!"person".equalsIgnoreCase(e.getKey())) count += e.getValue();
                    }
                }
                if (timeSeries.containsKey(key)) {
                    timeSeries.merge(key, count, Long::sum);
                }
            }
        } else {
            List<Object[]> rows = repository.getHourlyTimeSeries(start, end, district, VIETNAM_TZ_NAME);
            for (Object[] row : rows) {
                String timeKey = (String) row[0];
                Number total = (Number) row[1];
                if (timeSeries.containsKey(timeKey)) {
                    timeSeries.put(timeKey, total.longValue());
                }
            }
        }
        return timeSeries;
    }

    /**
     * Helper: Chuyển chuỗi YYYY-MM-DD sang LocalDate
     * Nếu chuỗi rỗng/null, mặc định là hôm nay (giờ Việt Nam)
     */
    private Instant parseToInstant(String dateStr, boolean isStart) {
        try {
            return Instant.parse(dateStr);
        } catch (DateTimeParseException e) {
            try {
                LocalDateTime ldt = LocalDateTime.parse(dateStr);
                return ldt.atZone(VIETNAM_ZONE).toInstant();
            } catch (DateTimeParseException e2) {
                try {
                    LocalDate ld = LocalDate.parse(dateStr);
                    return ld.atStartOfDay(VIETNAM_ZONE).toInstant();
                } catch (Exception ex) {
                    throw new IllegalArgumentException("Invalid date format: " + dateStr);
                }
            }
        }
    }

    private LocalDate parseDateOrDefault(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) return LocalDate.now(VIETNAM_ZONE);
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
            String district = metric.getDistrict();
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
}