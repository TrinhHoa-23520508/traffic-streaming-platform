package com.traffic_stream.dashboard.repository;

import com.traffic_stream.dashboard.entity.TrafficMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public interface TrafficMetricRepository extends JpaRepository<TrafficMetric, Long> {

    // API 1: Lấy 100 bản ghi mới nhất
    List<TrafficMetric> findFirst100ByOrderByTimestampDesc();

    // API 1 : Lấy 100 bản ghi mới nhất CÓ LỌC THEO QUẬN
    List<TrafficMetric> findFirst100ByDistrictOrderByTimestampDesc(String district);

    // API 1 : Lấy 100 bản ghi mới nhất TRONG KHOẢNG THỜI GIAN (không lọc quận)
    List<TrafficMetric> findFirst100ByTimestampBetweenOrderByTimestampDesc(Instant start, Instant end);

    // API 1 : Lấy 100 bản ghi mới nhất TRONG KHOẢNG THỜI GIAN VÀ THEO QUẬN
    List<TrafficMetric> findFirst100ByDistrictAndTimestampBetweenOrderByTimestampDesc(String district, Instant start, Instant end);

    // API 2 : Lấy summary (không lọc)
    @Query("SELECT t.district, SUM(t.totalCount) as total " +
            "FROM TrafficMetric t " +
            "GROUP BY t.district " +
            "ORDER BY total DESC")
    List<Object[]> getTrafficSummaryByDistrict();

    // API 2 : Lấy summary CÓ LỌC THEO NGÀY
    @Query("SELECT t.district, SUM(t.totalCount) as total " +
            "FROM TrafficMetric t " +
            "WHERE t.timestamp >= :start AND t.timestamp < :end " +
            "GROUP BY t.district " +
            "ORDER BY total DESC")
    List<Object[]> getTrafficSummaryByDistrictAndDate(
            @Param("start") Instant start,
            @Param("end") Instant end);

    // API 3 : Lấy TẤT CẢ bản ghi theo ngày
    List<TrafficMetric> findByTimestampBetween(Instant start, Instant end);

    // API 3b: Lấy TẤT CẢ bản ghi theo ngày VÀ camera
    List<TrafficMetric> findByTimestampBetweenAndCameraId(Instant start, Instant end, String cameraId);

    /**
     * API 4 (CHO CHART 24H): Lấy tổng count theo từng giờ trong ngày
     * - Lọc theo khoảng thời gian (start, end)
     * - Lọc tùy chọn theo quận (district)
     * - Trả về List<Object[]> với mỗi Object[] = [hour (Integer), total (Long)]
     * Lưu ý: Query này dùng hàm EXTRACT của Postgres và AT TIME ZONE để xử lý múi
     * giờ
     */
    @Query(value = "SELECT EXTRACT(HOUR FROM t.timestamp AT TIME ZONE :tz) as hour, SUM(t.total_count) as total " +
            "FROM traffic_metrics t " +
            "WHERE t.timestamp >= :start AND t.timestamp < :end " +
            "AND (:district IS NULL OR t.district = :district) " +
            "GROUP BY hour " +
            "ORDER BY hour ASC", nativeQuery = true)
    List<Object[]> getHourlySummary(
            @Param("start") Instant start,
            @Param("end") Instant end,
            @Param("district") String district,
            @Param("tz") String timezone);

    /** API 5
     * Tìm 1 bản ghi (First) theo cameraId,
     * sắp xếp (OrderBy) theo timestamp giảm dần (Desc)
     *
     * @param cameraId ID của camera
     * @return một Optional chứa TrafficMetric mới nhất, hoặc rỗng nếu không có
     */
    Optional<TrafficMetric> findFirstByCameraIdOrderByTimestampDesc(String cameraId);
}