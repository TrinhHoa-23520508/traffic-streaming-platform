package com.traffic_stream.dashboard.web;

import com.traffic_stream.dashboard.entity.TrafficMetric;
import com.traffic_stream.dashboard.repository.TrafficMetricRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api")
public class TrafficController {

    private final TrafficMetricRepository repo;
    private final SimpMessagingTemplate messagingTemplate;
    private final Random random = new Random();

    public TrafficController(TrafficMetricRepository repo,
                             SimpMessagingTemplate messagingTemplate) {
        this.repo = repo;
        this.messagingTemplate = messagingTemplate;
    }

    /**
//     * 🔹 Lấy danh sách metrics mới nhất, có thể filter theo areaId
     */
    @GetMapping("/metrics/latest")
    public List<TrafficMetric> latest(
            @RequestParam(required = false) String areaId,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        Pageable pageable = PageRequest.of(offset / limit, limit);
        if (areaId != null && !areaId.isEmpty()) {
            return repo.findByAreaIdOrderByTimestampDesc(areaId, pageable);
        } else {
            return repo.findAllByOrderByTimestampDesc(pageable);
        }
    }

    /**
     * 🔹 Lấy metrics theo Id Camera
     */
    @GetMapping("/metrics/find")
    public ResponseEntity<TrafficMetric> find(
            @RequestParam(required = true) String areaId
    ) {
        if (areaId == null || areaId.isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        TrafficMetric latest = repo.findTopByAreaIdOrderByTimestampDesc(areaId);

        if (latest != null) {
            return ResponseEntity.ok(latest);
        } else {
            return ResponseEntity.noContent().build();
        }
    }


    /**
     * 🔹 Lấy dữ liệu lịch sử theo khoảng thời gian
     */
    @GetMapping("/metrics/history")
    public List<TrafficMetric> history(
            @RequestParam String from,
            @RequestParam String to,
            @RequestParam(required = false) String areaId
    ) {
        Instant start = Instant.parse(from);
        Instant end = Instant.parse(to);

        if (areaId != null && !areaId.isEmpty()) {
            return repo.findByAreaIdAndTimestampBetween(areaId, start, end);
        } else {
            return repo.findByTimestampBetween(start, end);
        }
    }

    /**
     * 🔹 Dự báo congestion cho các khu vực (areaId)
     */
    @GetMapping("/congestion/predict")
    public List<Map<String, Object>> predict(@RequestParam List<String> areaIds) {
        return areaIds.stream()
                .map(areaId -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("areaId", areaId);
                    map.put("prediction", randomPrediction());
                    map.put("probability", Math.round((0.5 + random.nextDouble() * 0.5) * 100.0) / 100.0);
                    return map;
                })
                .collect(java.util.stream.Collectors.toList());
    }

    private String randomPrediction() {
        String[] levels = {"low", "medium", "high"};
        return levels[random.nextInt(levels.length)];
    }

    /**
     * 🔹 Gửi realtime metric (khi Kafka consumer nhận dữ liệu)
     */
    public void pushRealtimeMetric(TrafficMetric metric) {
        messagingTemplate.convertAndSend("/topic/metrics", metric);
    }
}
