package com.traffic_stream.dashboard.repository;

import com.traffic_stream.dashboard.entity.TrafficMetric;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface TrafficMetricRepository extends JpaRepository<TrafficMetric, Long> {
    // 🔹 Lấy dữ liệu theo areaId
    TrafficMetric findTopByAreaIdOrderByTimestampDesc(String areaId);

    // 🔹 Lấy dữ liệu theo areaId (mới nhất trước)
    List<TrafficMetric> findByAreaIdOrderByTimestampDesc(String areaId, Pageable pageable);

    // 🔹 Lấy tất cả dữ liệu, sắp xếp theo thời gian giảm dần
    List<TrafficMetric> findAllByOrderByTimestampDesc(Pageable pageable);

    // 🔹 Lấy dữ liệu theo khoảng thời gian và areaId
    List<TrafficMetric> findByAreaIdAndTimestampBetween(String areaId, Instant from, Instant to);

    // 🔹 Lấy toàn bộ dữ liệu trong khoảng thời gian (nếu không filter area)
    List<TrafficMetric> findByTimestampBetween(Instant from, Instant to);
}
