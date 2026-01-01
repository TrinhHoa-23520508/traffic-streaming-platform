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

    /**
     * API 4 (CHO CHART 24H): Lấy tổng count theo từng giờ trong ngày
     * - Lọc theo khoảng thời gian (start, end)
     * - Lọc tùy chọn theo quận (district)
     * - Trả về List<Object[]> với mỗi Object[] = [hour (Integer), total (Long)]
     * Lưu ý: Query này dùng hàm EXTRACT của Postgres và AT TIME ZONE để xử lý múi
     * giờ
     */
    @Query(value = "SELECT to_char(t.timestamp AT TIME ZONE :tz, 'YYYY-MM-DD\"T\"HH24:00:00') as time_bucket, " +
            "SUM(t.total_count) as total " +
            "FROM traffic_metrics t " +
            "WHERE t.timestamp >= :start AND t.timestamp < :end " +
            "AND (:district IS NULL OR t.district = :district) " +
            "GROUP BY time_bucket " +
            "ORDER BY time_bucket ASC", nativeQuery = true)
    List<Object[]> getHourlyTimeSeries(
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


    //Tìm theo khoảng thời gian và camera (cho API Hourly Summary có filter camera)
    List<TrafficMetric> findByTimestampBetweenAndCameraId(Instant start, Instant end, String cameraId);

    //Tìm theo khoảng thời gian và quận (cho API Hourly Summary có filter quận)
    List<TrafficMetric> findByTimestampBetweenAndDistrict(Instant start, Instant end, String district);

    @Query("SELECT DISTINCT t.district FROM TrafficMetric t ORDER BY t.district")
    List<String> findDistinctDistricts();

    @Query("SELECT DISTINCT t.cameraId FROM TrafficMetric t ORDER BY t.cameraId")
    List<String> findDistinctCameraIds();

    @Query("SELECT DISTINCT t.cameraId FROM TrafficMetric t WHERE t.district = :district ORDER BY t.cameraId")
    List<String> findDistinctCameraIdsByDistrict(@Param("district") String district);

    List<TrafficMetric> findByCameraIdIn(List<String> cameraIds);

    List<TrafficMetric> findByCameraIdInAndTimestampBetween(List<String> cameraIds, Instant start, Instant end);
    List<TrafficMetric> findByDistrictInAndTimestampBetween(List<String> districts, Instant start, Instant end);

    // Validation queries - optimized for minimal DB calls
    @Query("SELECT DISTINCT t.district FROM TrafficMetric t WHERE t.district IN :districts")
    List<String> findExistingDistrictsIn(@Param("districts") List<String> districts);

    @Query("SELECT DISTINCT t.cameraId FROM TrafficMetric t WHERE t.cameraId IN :cameraIds")
    List<String> findExistingCameraIdsIn(@Param("cameraIds") List<String> cameraIds);

    @Query("SELECT DISTINCT t.cameraId, t.district FROM TrafficMetric t WHERE t.cameraId IN :cameraIds")
    List<Object[]> findCameraDistrictMappingsByCameraIds(@Param("cameraIds") List<String> cameraIds);

    /**
     * API Max Count: Lấy bản ghi có lượng xe lớn nhất của 1 camera
     * Spring Data JPA sẽ tự động tạo query: ORDER BY totalCount DESC LIMIT 1
     */
    Optional<TrafficMetric> findTopByCameraIdOrderByTotalCountDesc(String cameraId);

    /**
     * API Flow Rate: Tính tổng số lượng xe đã đếm được trong khoảng thời gian
     * Dùng để tính toán: (Tổng xe) / (Số phút)
     */
    @Query("SELECT SUM(t.totalCount) FROM TrafficMetric t " +
            "WHERE t.cameraId = :cameraId AND t.timestamp BETWEEN :start AND :end")
    Long sumTotalCountByCameraIdAndTimestamp(
            @Param("cameraId") String cameraId,
            @Param("start") Instant start,
            @Param("end") Instant end);

    /**
     * API Growth Rate: Tính tổng số xe theo từng quận trong khoảng thời gian
     * Trả về List Object[]: [0] = district (String), [1] = totalCount (Long)
     */
    @Query("SELECT t.district, SUM(t.totalCount) " +
            "FROM TrafficMetric t " +
            "WHERE t.timestamp >= :start AND t.timestamp < :end " +
            "GROUP BY t.district")
    List<Object[]> sumTotalCountByDistrictBetween(
            @Param("start") Instant start,
            @Param("end") Instant end);

    /**
     * API Busiest Camera: Tính tổng số xe theo từng Camera trong khoảng thời gian
     * Trả về List Object[]: [0] = cameraName (String), [1] = totalCount (Long)
     */
    @Query("SELECT t.cameraName, SUM(t.totalCount) " +
            "FROM TrafficMetric t " +
            "WHERE t.timestamp >= :start AND t.timestamp < :end " +
            "GROUP BY t.cameraName")
    List<Object[]> sumTotalCountByCameraBetween(
            @Param("start") Instant start,
            @Param("end") Instant end);

    /**
     * Lấy Max Count của danh sách camera (Dùng cho API /latest để tối ưu hiệu năng)
     * Trả về: [cameraId, maxCount]
     */
    @Query("SELECT t.cameraId, MAX(t.totalCount) " +
            "FROM TrafficMetric t " +
            "WHERE t.cameraId IN :cameraIds " +
            "GROUP BY t.cameraId")
    List<Object[]> findMaxCountsByCameraIds(@Param("cameraIds") List<String> cameraIds);

    /**
     * Lấy Max Count của 1 camera cụ thể (Dùng cho Consumer)
     */
    @Query("SELECT MAX(t.totalCount) FROM TrafficMetric t WHERE t.cameraId = :cameraId")
    Integer findMaxCountByCameraId(@Param("cameraId") String cameraId);

    /**
     * API Lấy tổng count theo từng PHÚT
     */
    @Query(value = "SELECT to_char(t.timestamp AT TIME ZONE :tz, 'YYYY-MM-DD\"T\"HH24:MI:00') as time_bucket, " +
            "SUM(t.total_count) as total " +
            "FROM traffic_metrics t " +
            "WHERE t.timestamp >= :start AND t.timestamp < :end " +
            "AND (:district IS NULL OR t.district = :district) " +
            "GROUP BY time_bucket " +
            "ORDER BY time_bucket ASC", nativeQuery = true)
    List<Object[]> getMinuteTimeSeries(
            @Param("start") Instant start,
            @Param("end") Instant end,
            @Param("district") String district,
            @Param("tz") String timezone);

}