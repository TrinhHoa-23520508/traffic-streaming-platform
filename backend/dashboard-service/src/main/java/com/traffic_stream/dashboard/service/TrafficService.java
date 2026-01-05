package com.traffic_stream.dashboard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.traffic_stream.dashboard.dto.*;
import com.traffic_stream.dashboard.entity.TrafficMetric;
import com.traffic_stream.dashboard.repository.TrafficMetricRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.BatchPreparedStatementSetter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
public class TrafficService {

    private static final Logger log = LoggerFactory.getLogger(TrafficService.class);

    private final TrafficMetricRepository repository;
    private final SimpMessagingTemplate messagingTemplate;
    private final JdbcTemplate jdbcTemplate; // Dùng JDBC để insert cực nhanh
    private final ObjectMapper objectMapper; // Để convert JSONB

    private final ExecutorService webSocketExecutor = Executors.newFixedThreadPool(10);
    private final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final String VIETNAM_TZ_NAME = "Asia/Ho_Chi_Minh";

    public TrafficService(TrafficMetricRepository repository,
                          SimpMessagingTemplate messagingTemplate,
                          JdbcTemplate jdbcTemplate,
                          ObjectMapper objectMapper) {
        this.repository = repository;
        this.messagingTemplate = messagingTemplate;
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * LOGIC Gửi WebSocket TRƯỚC -> Lưu DB SAU
     */
    @Transactional
    public void processMetricsBatch(List<TrafficMetricsDTO> dtoList) {
        if (dtoList == null || dtoList.isEmpty()) return;

        long startTime = System.currentTimeMillis();

        CompletableFuture.runAsync(() -> {
            try {
                messagingTemplate.convertAndSend("/topic/traffic-batch", dtoList);
            } catch (Exception e) {
                log.warn("Lỗi gửi WebSocket batch: {}", e.getMessage());
            }
        }, webSocketExecutor);

        bulkInsertMetrics(dtoList);

        long dataTime = dtoList.get(0).getTimestamp();
        long now = System.currentTimeMillis();
        long latency = now - dataTime;
        log.info("Batch Size: {}. DB Insert: {}ms. Data Latency: {}ms (RowTime: {} -> Now: {})", 
                dtoList.size(), (now - startTime), latency, Instant.ofEpochMilli(dataTime), Instant.ofEpochMilli(now));
    }

    /**
     * Hàm Insert Bulk sử dụng Raw SQL để đạt hiệu năng tối đa
     */
    /**
     * Hàm Insert Bulk sử dụng Raw SQL để đạt hiệu năng tối đa
     */
    private void bulkInsertMetrics(List<TrafficMetricsDTO> list) {
        String sql = "INSERT INTO traffic_metrics " +
                "(camera_id, camera_name, district, annotated_image_url, coordinates, detection_details, total_count, timestamp) " +
                "VALUES (?, ?, ?, ?, ?::jsonb, ?::jsonb, ?, ?)";

        try {
            int[] result = jdbcTemplate.batchUpdate(sql, new BatchPreparedStatementSetter() {
                @Override
                public void setValues(PreparedStatement ps, int i) throws SQLException {
                    TrafficMetricsDTO dto = list.get(i);
                    try {
                        ps.setString(1, dto.getCameraId());
                        ps.setString(2, dto.getCameraName());
                        ps.setString(3, dto.getDistrict());
                        ps.setString(4, dto.getAnnotatedImageUrl());

                        ps.setString(5, objectMapper.writeValueAsString(dto.getCoordinates()));
                        ps.setString(6, objectMapper.writeValueAsString(dto.getDetectionDetails()));

                        ps.setInt(7, dto.getTotalCount());
                        ps.setTimestamp(8, Timestamp.from(Instant.ofEpochMilli(dto.getTimestamp())));
                    } catch (Exception e) {
                        log.error("Lỗi map dữ liệu JDBC tại index {}: ", i, e);
                    }
                }

                @Override
                public int getBatchSize() {
                    return list.size();
                }
            });
            log.info("Successfully inserted {} rows into database.", result.length);
        } catch (Exception e) {
            log.error("Lỗi Critical khi insert batch vào DB: ", e);
        }
    }

    /**
     * API 1: Lấy 100 bản ghi mới nhất
     * - Nếu có date: Lấy 100 bản ghi mới nhất CỦA NGÀY ĐÓ.
     * - Nếu không có date: Lấy 100 bản ghi mới nhất TÍNH ĐẾN HIỆN TẠI (Real-time).
     */
    public List<TrafficMetric> getLatestTrafficMetrics(String district, String dateStr) {
        List<TrafficMetric> metrics;

        if (dateStr != null && !dateStr.isEmpty()) {
            LocalDate date = parseDateOrDefault(dateStr);
            Instant startOfDay = date.atStartOfDay(VIETNAM_ZONE).toInstant();
            Instant endOfDay = date.plusDays(1).atStartOfDay(VIETNAM_ZONE).toInstant();

            if (district != null && !district.isEmpty()) {
                metrics = repository.findFirst100ByDistrictAndTimestampBetweenOrderByTimestampDesc(district, startOfDay, endOfDay);
            } else {
                metrics = repository.findFirst100ByTimestampBetweenOrderByTimestampDesc(startOfDay, endOfDay);
            }
        } else {
            if (district != null && !district.isEmpty()) {
                metrics = repository.findFirst100ByDistrictOrderByTimestampDesc(district);
            } else {
                metrics = repository.findFirst100ByOrderByTimestampDesc();
            }
        }

        if (!metrics.isEmpty()) {
            List<String> cameraIds = metrics.stream()
                    .map(TrafficMetric::getCameraId)
                    .distinct()
                    .collect(Collectors.toList());

            List<Object[]> maxCounts = repository.findMaxCountsByCameraIds(cameraIds);

            Map<String, Integer> maxCountMap = new HashMap<>();
            for (Object[] row : maxCounts) {
                String camId = (String) row[0];
                Integer max = (Integer) row[1];
                if (camId != null && max != null) {
                    maxCountMap.put(camId, max);
                }
            }

            for (TrafficMetric m : metrics) {
                m.setMaxCount(maxCountMap.getOrDefault(m.getCameraId(), 0));
            }
        }

        return metrics;
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
     * Tổng hợp chi tiết theo QUẬN và PHÚT (Real-time)
     * - Dữ liệu trả về sẽ có format time là: yyyy-MM-dd'T'HH:mm:00
     * - Key Map bây giờ là: District + Time (để tách các phút ra)
     */
    public List<HourlyDistrictSummaryDTO> getDetailedHourlySummaryByDistrict(Instant startTime, Instant endTime) {
        List<TrafficMetric> metrics = repository.findByTimestampBetween(startTime, endTime);
        Map<String, HourlyDistrictSummaryDTO> summaryMap = new HashMap<>();

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:00").withZone(VIETNAM_ZONE);

        for (TrafficMetric metric : metrics) {
            String district = metric.getDistrict();
            if (district == null || district.isEmpty()) {
                continue;
            }

            String timeBucket = formatter.format(metric.getTimestamp());

            String key = district + "_" + timeBucket;

            HourlyDistrictSummaryDTO summaryDTO = summaryMap.computeIfAbsent(
                    key,
                    k -> new HourlyDistrictSummaryDTO(district, timeBucket)
            );
            summaryDTO.addMetric(metric);
        }

        return new ArrayList<>(summaryMap.values());
    }

    public List<DistrictDTO> getAllDistricts() {
        return repository.findDistinctDistricts()
                .stream()
                .map(DistrictDTO::new)
                .toList();
    }

    public List<CameraDTO> getAllCameras(String district) {
        List<String> cameraIds;
        if (district != null && !district.trim().isEmpty()) {
            cameraIds = repository.findDistinctCameraIdsByDistrict(district);
        } else {
            cameraIds = repository.findDistinctCameraIds();
        }

        // Get only ONE (latest) metric per camera to avoid duplicates
        return cameraIds.stream()
                .map(repository::findFirstByCameraIdOrderByTimestampDesc)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .map(metric -> CameraDTO.builder()
                        .cameraName(metric.getCameraName())
                        .cameraId(metric.getCameraId())
                        .district(metric.getDistrict())
                        .build()
                )
                .toList();
    }

    /**
     * FEATURE lấy số lượng xe tối đa (Peak Traffic)
     * Trả về thông tin bản ghi có lượng xe cao nhất từng ghi nhận
     */
    public Map<String, Object> getMaxTrafficCount(String cameraId) {
        Optional<TrafficMetric> maxMetricOpt = repository.findTopByCameraIdOrderByTotalCountDesc(cameraId);

        Map<String, Object> result = new HashMap<>();
        if (maxMetricOpt.isPresent()) {
            TrafficMetric m = maxMetricOpt.get();
            result.put("cameraId", m.getCameraId());
            result.put("maxVehicleCount", m.getTotalCount());
            result.put("timestamp", m.getTimestamp());
            result.put("district", m.getDistrict());
        } else {
            result.put("message", "No data found for this camera");
        }
        return result;
    }

    /**
     * FEATURE tính lưu lượng xe/phút (Traffic Flow Rate)
     * Logic: Tổng số xe đếm được trong khoảng thời gian / Tổng số phút của khoảng thời gian đó
     */
    public Map<String, Object> calculateTrafficFlow(String cameraId, String startStr, String endStr) {
        Instant now = Instant.now();
        Instant end = (endStr != null && !endStr.isEmpty()) ? parseToInstant(endStr, false) : now;
        Instant start = (startStr != null && !startStr.isEmpty()) ? parseToInstant(startStr, true) : now.minus(1, ChronoUnit.HOURS);

        Long totalVehicles = repository.sumTotalCountByCameraIdAndTimestamp(cameraId, start, end);
        if (totalVehicles == null) totalVehicles = 0L;

        long durationInMinutes = Duration.between(start, end).toMinutes();
        if (durationInMinutes <= 0) durationInMinutes = 1;

        double flowRate = (double) totalVehicles / durationInMinutes;

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("cameraId", cameraId);
        response.put("totalVehiclesDetected", totalVehicles);
        response.put("durationMinutes", durationInMinutes);
        response.put("flowRatePerMinute", Math.round(flowRate * 100.0) / 100.0);
        response.put("periodStart", start);
        response.put("periodEnd", end);

        return response;
    }

    /**
     * FEATURE 2: Top 5 Khu vực tăng trưởng (Sliding Window 5 Phút)
     * - Khắc phục triệt để lỗi -100% / +100% do độ trễ xử lý.
     * - Dữ liệu luôn được "lấp đầy" bởi các phút lân cận.
     */
    public List<DistrictGrowthDTO> getTop5FastestGrowingDistricts() {
        Instant now = Instant.now();

        Instant currentEnd = now;
        Instant currentStart = now.minus(5, ChronoUnit.MINUTES);

        Instant prevEnd = currentStart;
        Instant prevStart = currentStart.minus(5, ChronoUnit.MINUTES);

        Map<String, Long> currentData = getDistrictCountMap(currentStart, currentEnd);
        Map<String, Long> prevData = getDistrictCountMap(prevStart, prevEnd);

        List<DistrictGrowthDTO> growthList = new ArrayList<>();

        Set<String> allDistricts = new HashSet<>();
        allDistricts.addAll(currentData.keySet());
        allDistricts.addAll(prevData.keySet());

        for (String district : allDistricts) {
            long currentTotal = currentData.getOrDefault(district, 0L);
            long prevTotal = prevData.getOrDefault(district, 0L);

            long currentAvg = Math.round(currentTotal / 5.0);
            long prevAvg = Math.round(prevTotal / 5.0);

            if (currentAvg == 0 && prevAvg == 0) continue;

            double growthRate;
            if (prevAvg == 0) {
                growthRate = 100.0;
            } else {
                growthRate = ((double) (currentAvg - prevAvg) / prevAvg) * 100;
            }

            growthList.add(new DistrictGrowthDTO(
                    district,
                    Math.round(growthRate * 100.0) / 100.0,
                    currentAvg,
                    prevAvg
            ));
        }

        growthList.sort((a, b) -> Double.compare(b.getGrowthRate(), a.getGrowthRate()));

        return growthList.stream().limit(5).collect(Collectors.toList());
    }

    /**
     * FEATURE (4): Tỷ lệ loại phương tiện toàn thành phố (Vehicle Type Ratio)
     * - Logic: Lấy dữ liệu 5 phút gần nhất (Sliding Window) để đảm bảo độ chính xác.
     * - Tính tổng số lượng từng loại xe từ field 'detectionDetails' JSONB.
     * - Loại bỏ "person" vì không phải là xe.
     */
    public List<VehicleTypeRatioDTO> getCityWideVehicleTypeRatio() {
        Instant now = Instant.now();
        Instant end = now;
        Instant start = now.minus(5, ChronoUnit.MINUTES);

        List<TrafficMetric> metrics = repository.findByTimestampBetween(start, end);

        Map<String, Long> typeCountMap = new HashMap<>();
        long totalVehicles = 0;

        for (TrafficMetric metric : metrics) {
            Map<String, Integer> details = metric.getDetectionDetails();
            if (details != null) {
                for (Map.Entry<String, Integer> entry : details.entrySet()) {
                    String type = entry.getKey();
                    int count = entry.getValue();

                    if ("person".equalsIgnoreCase(type)) continue;

                    typeCountMap.put(type, typeCountMap.getOrDefault(type, 0L) + count);
                    totalVehicles += count;
                }
            }
        }

        List<VehicleTypeRatioDTO> result = new ArrayList<>();
        if (totalVehicles == 0) {
            return result;
        }

        for (Map.Entry<String, Long> entry : typeCountMap.entrySet()) {
            double percentage = (double) entry.getValue() / totalVehicles * 100.0;
            result.add(new VehicleTypeRatioDTO(
                    entry.getKey(),
                    entry.getValue(),
                    Math.round(percentage * 100.0) / 100.0
            ));
        }

        result.sort((a, b) -> Double.compare(b.getPercentage(), a.getPercentage()));

        return result;
    }

    /**
     * FEATURE (6a): Top 5 Quận đông nhất (Busiest Districts)
     * Logic: Trung bình cộng 5 phút (Sliding Window)
     */
    public List<TopTrafficDTO> getTop5BusiestDistricts() {
        return getTopBusiestEntities(true);
    }

    /**
     * FEATURE (6b): Top 5 Camera đông nhất (Busiest Cameras)
     * Logic: Trung bình cộng 5 phút (Sliding Window)
     */
    public List<TopTrafficDTO> getTop5BusiestCameras() {
        return getTopBusiestEntities(false);
    }

    private List<TopTrafficDTO> getTopBusiestEntities(boolean isDistrict) {
        Instant now = Instant.now();
        Instant end = now;
        Instant start = now.minus(5, ChronoUnit.MINUTES);

        List<Object[]> rows = isDistrict
                ? repository.sumTotalCountByDistrictBetween(start, end)
                : repository.sumTotalCountByCameraBetween(start, end);

        List<TopTrafficDTO> result = new ArrayList<>();
        for (Object[] row : rows) {
            String name = (String) row[0];
            Long totalCount = (Long) row[1];

            if (name == null || totalCount == null) continue;

            long avgCount = Math.round(totalCount / 5.0);

            if (avgCount > 0) {
                result.add(new TopTrafficDTO(name, avgCount));
            }
        }

        return result.stream()
                .sorted((a, b) -> Long.compare(b.getCount(), a.getCount()))
                .limit(5)
                .collect(Collectors.toList());
    }

    /**
     * API: Lấy Time Series theo PHÚT
     * Mặc định: Từ 1 tiếng trước -> Hiện tại
     */
    public Map<String, Long> getMinuteTimeSeries(String startStr, String endStr, String district, String cameraId) {
        Instant now = Instant.now();
        Instant oneHourAgo = now.minus(1, ChronoUnit.HOURS);

        Instant end = (endStr != null && !endStr.isEmpty()) ? parseToInstant(endStr, false) : now;
        Instant start = (startStr != null && !startStr.isEmpty()) ? parseToInstant(startStr, true) : oneHourAgo;

        Map<String, Long> timeSeries = new LinkedHashMap<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:00");

        ZonedDateTime currentZdt = start.atZone(VIETNAM_ZONE).truncatedTo(ChronoUnit.MINUTES);
        ZonedDateTime endZdt = end.atZone(VIETNAM_ZONE);

        int safety = 0;
        while (currentZdt.isBefore(endZdt) && safety < 1440) {
            timeSeries.put(formatter.format(currentZdt), 0L);
            currentZdt = currentZdt.plusMinutes(1);
            safety++;
        }

        if (cameraId != null && !cameraId.isEmpty()) {
            List<TrafficMetric> metrics = repository.findByTimestampBetweenAndCameraId(start, end, cameraId);
            for (TrafficMetric metric : metrics) {
                ZonedDateTime zdt = metric.getTimestamp().atZone(VIETNAM_ZONE).truncatedTo(ChronoUnit.MINUTES);
                String key = formatter.format(zdt);
                long count = metric.getTotalCount();
                if (timeSeries.containsKey(key)) {
                    timeSeries.merge(key, count, Long::sum);
                }
            }
        } else {
            List<Object[]> rows = repository.getMinuteTimeSeries(start, end, district, VIETNAM_TZ_NAME);
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
     * Helper 1: Query DB để lấy tổng xe theo quận trong khoảng thời gian
     */
    private Map<String, Long> getDistrictCountMap(Instant start, Instant end) {
        List<Object[]> rows = repository.sumTotalCountByDistrictBetween(start, end);
        Map<String, Long> result = new HashMap<>();
        for (Object[] row : rows) {
            String district = (String) row[0];
            Long count = (Long) row[1];
            if (district != null) {
                result.put(district, count);
            }
        }
        return result;
    }

    /**
     * Helper 2: Fallback lấy Top 5 đông nhất khi không có tăng trưởng
     */
    private List<DistrictGrowthDTO> getTop5BusiestDistrictsFallback(Instant start, Instant end) {
        Map<String, Long> data = getDistrictCountMap(start, end);
        return data.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(5)
                .map(e -> new DistrictGrowthDTO(e.getKey(), 0.0, e.getValue(), 0L))
                .collect(Collectors.toList());
    }
}