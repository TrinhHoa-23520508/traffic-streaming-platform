package com.traffic_stream.dashboard.consumer;

import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.traffic_stream.dashboard.repository.TrafficMetricRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import com.traffic_stream.dashboard.entity.TrafficMetric;
import com.traffic_stream.dashboard.dto.TrafficMetricsDTO;

import java.time.Instant;

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

            TrafficMetric entity = new TrafficMetric();
            entity.setCameraId(dto.getCameraId());
            entity.setCameraName(dto.getCameraName());
            entity.setDistrict(dto.getDistrict());
            entity.setCoordinates(dto.getCoordinates());
            entity.setAnnotatedImageUrl(dto.getAnnotatedImageUrl());
            entity.setDetectionDetails(dto.getDetectionDetails());
            entity.setTotalCount(dto.getTotalCount());
            entity.setTimestamp(Instant.ofEpochMilli(dto.getTimestamp()));

            repo.save(entity);

            Integer dbMax = repo.findMaxCountByCameraId(dto.getCameraId());
            if (dbMax == null) dbMax = 0;
            int finalMax = Math.max(dbMax, dto.getTotalCount());
            dto.setMaxCount(finalMax);
            dto.setTimestamp(System.currentTimeMillis());
            ws.convertAndSend("/topic/traffic", dto);

        } catch (Exception ex) {
            ex.printStackTrace();
        }
    }
}