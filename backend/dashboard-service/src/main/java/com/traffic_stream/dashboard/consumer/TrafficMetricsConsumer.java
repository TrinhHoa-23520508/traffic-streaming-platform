package com.traffic_stream.dashboard.consumer;

import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.traffic_stream.dashboard.repository.TrafficMetricRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import com.traffic_stream.dashboard.entity.TrafficMetric;
import com.traffic_stream.dashboard.dto.TrafficMetricsDTO;


@Service
public class TrafficMetricsConsumer {

    private final ObjectMapper mapper;
    private final TrafficMetricRepository repo;
    private final SimpMessagingTemplate ws;

    public TrafficMetricsConsumer(TrafficMetricRepository repo, SimpMessagingTemplate ws, ObjectMapper mapper) {
        this.repo = repo;
        this.ws = ws;
        this.mapper = mapper;
    }

    @KafkaListener(topics = "traffic_metrics_topic", groupId = "dashboard-group")
    public void consume(String message) {
        try {
            TrafficMetricsDTO dto = mapper.readValue(message, TrafficMetricsDTO.class);

            // Save minimal record
            TrafficMetric e = new TrafficMetric();
            e.setImageName(dto.getImageName());
            e.setAreaId(dto.getAreaId());
            e.setVehicleCounts(dto.getVehicleCounts());
            e.setTotalVehicles(dto.getTotalVehicles());
            e.setTrafficDensity(dto.getTrafficDensity());
            e.setTimestamp(dto.getTimestamp());
            repo.save(e);

            // Push to websocket clients
            ws.convertAndSend("/topic/traffic", dto);
        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }
}
