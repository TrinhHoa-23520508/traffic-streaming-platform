package com.traffic_stream.dashboard.web;

import com.traffic_stream.dashboard.dto.CameraDTO;
import com.traffic_stream.dashboard.dto.DistrictDTO;
import com.traffic_stream.dashboard.entity.TrafficMetric;
import com.traffic_stream.dashboard.service.TrafficService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.traffic_stream.dashboard.dto.DistrictDailySummaryDTO;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/traffic")
@CrossOrigin(originPatterns = "*") // Đổi sang originPatterns
public class TrafficController {

    private final TrafficService trafficService;

    public TrafficController(TrafficService trafficService) {
        this.trafficService = trafficService;
    }

    /**
     * API 1: Lấy 100 bản ghi mới nhất
     * Lọc (optional): ?district=Tên Quận
     * Endpoint: GET /api/traffic/latest
     * Endpoint: GET /api/traffic/latest?district=Quận 1
     * Endpoint: GET /api/traffic/latest?district=Quận 1&date=2025-11-25 (năm - tháng - ngày)
     */
    @GetMapping("/latest")
    public ResponseEntity<List<TrafficMetric>> getLatestMetrics(
            @RequestParam(required = false) String district,
            @RequestParam(required = false) String date)
    {
        List<TrafficMetric> metrics = trafficService.getLatestTrafficMetrics(district, date);
        return ResponseEntity.ok(metrics);
    }

    /**
     * API 2: Lấy dữ liệu tổng hợp CHI TIẾT theo quận
     * Lọc (optional): ?date=YYYY-MM-DD (Mặc định là hôm nay)
     * Endpoint: GET /api/traffic/summary/by-district
     */
    @GetMapping("/summary/by-district")
    public ResponseEntity<Map<String, DistrictDailySummaryDTO>> getDistrictSummary(@RequestParam(required = false) String date) {
        Map<String, DistrictDailySummaryDTO> summary = trafficService.getDistrictSummary(date);
        return ResponseEntity.ok(summary);
    }

    /**
     * API 3 (Cho Heatmap và list): Lấy tất cả metrics theo ngày và camera
     * Lọc (optional): ?date=YYYY-MM-DD (Mặc định là hôm nay)
     * Lọc (optional): ?cameraId=Id
     * Endpoint: GET /api/traffic/by-date
     */
    @GetMapping("/by-date")
    public ResponseEntity<List<TrafficMetric>> getMetricsByDate(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String cameraId) {
        List<TrafficMetric> metrics = trafficService.getMetricsByDate(date, cameraId);
        return ResponseEntity.ok(metrics);
    }

    /**
     * API 4 (CHO CHART 24H): Lấy tổng count theo giờ
     * Lọc (optional): ?date=YYYY-MM-DD (Mặc định là hôm nay)
     * Lọc (optional): ?district=Tên Quận
     * Endpoint: GET /api/traffic/hourly-summary
     * Endpoint: GET /api/traffic/hourly-summary?date=2025-10-30&district=Quận 1
     */
    @GetMapping("/hourly-summary")
    public ResponseEntity<Map<Integer, Long>> getHourlySummary(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String district) {
        Map<Integer, Long> summary = trafficService.getHourlySummary(date, district);
        return ResponseEntity.ok(summary);
    }

    /**
     * API 5 : Lấy bản ghi MỚI NHẤT của 1 camera cụ thể
     * Sử dụng @PathVariable để lấy ID từ đường dẫn
     * Endpoint: GET /api/traffic/camera/{cameraId}/latest
     * Ví dụ:   GET /api/traffic/camera/cam-bay-hien-2/latest
     */
    @GetMapping("/camera/{cameraId}/latest")
    public ResponseEntity<TrafficMetric> getLatestMetricForCamera(
            @PathVariable String cameraId) {
        TrafficMetric metric = trafficService.getLatestMetricByCameraId(cameraId);
        if (metric != null) {
            return ResponseEntity.ok(metric);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * API 6: Lấy danh sách tất cả các quận có dữ liệu
     * Endpoint: GET /api/traffic/districts
     */
    @GetMapping("/districts")
    public ResponseEntity<List<DistrictDTO>> getAllDistricts() {
        List<DistrictDTO> districts = trafficService.getAllDistricts();
        return ResponseEntity.ok(districts);
    }

    /**
     * API 7: Lấy danh sách tất cả camera
     * Lọc (optional): ?district=Tên Quận
     * Endpoint: GET /api/traffic/cameras
     * Endpoint: GET /api/traffic/cameras?district=Quận 1
     */
    @GetMapping("/cameras")
    public ResponseEntity<List<CameraDTO>> getAllCameras(
            @RequestParam(required = false) String district) {
        List<CameraDTO> cameras = trafficService.getAllCameras(district);
        return ResponseEntity.ok(cameras);
    }

}