package com.traffic_stream.dashboard.consumer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.traffic_stream.dashboard.dto.TrafficMetricsDTO;
import com.traffic_stream.dashboard.service.TrafficService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class TrafficMetricsConsumer {

    private final TrafficService trafficService;

    @KafkaListener(
            topics = "${spring.kafka.topic.name}",
            groupId = "${spring.kafka.consumer.group-id}",
            containerFactory = "kafkaListenerContainerFactory"
    )
    public void consumeTrafficMetricsBatch(List<TrafficMetricsDTO> metricsList, Acknowledgment ack) {
        try {
            if (metricsList != null && !metricsList.isEmpty()) {
                log.info("Received batch of {} metrics", metricsList.size());

                trafficService.processMetricsBatch(metricsList);
            }

            ack.acknowledge();
        } catch (Exception e) {
            log.error("Error processing batch metrics", e);
        }
    }
}