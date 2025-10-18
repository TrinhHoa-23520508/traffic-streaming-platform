package com.traffic_stream.processing_service.service;

import com.traffic_stream.processing_service.dto.CameraRawDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class KafkaConsumerService {
    private static final Logger LOGGER = LoggerFactory.getLogger(KafkaConsumerService.class);
    private final TrafficProcessingService trafficProcessingService;

    public KafkaConsumerService(TrafficProcessingService trafficProcessingService) {
        this.trafficProcessingService = trafficProcessingService;
    }

    @KafkaListener(topics = "hcm_traffic_data", groupId = "${spring.kafka.consumer.group-id}")
    public void consume(CameraRawDTO cameraData) {
        LOGGER.info("Received data from camera: {} ({})", cameraData.getId(), cameraData.getName());

        if (cameraData.getLiveviewUrl() == null || cameraData.getLiveviewUrl().isEmpty()) {
            LOGGER.warn("Camera {} has no live view URL. Skipping.", cameraData.getId());
            return;
        }

        trafficProcessingService.processTrafficData(cameraData);
    }
}