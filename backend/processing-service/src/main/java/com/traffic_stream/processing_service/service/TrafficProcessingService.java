package com.traffic_stream.processing_service.service;

import com.traffic_stream.processing_service.dto.AiAnalysisResult;
import com.traffic_stream.processing_service.dto.CameraRawDTO;
import com.traffic_stream.processing_service.dto.EnrichedTrafficData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class TrafficProcessingService {
    private static final Logger LOGGER = LoggerFactory.getLogger(TrafficProcessingService.class);
    private static final String OUTPUT_TOPIC = "traffic_metrics_topic";

    private final AiAnalysisService aiAnalysisService;
    private final KafkaTemplate<String, EnrichedTrafficData> kafkaTemplate;

    public TrafficProcessingService(AiAnalysisService aiAnalysisService, KafkaTemplate<String, EnrichedTrafficData> kafkaTemplate) {
        this.aiAnalysisService = aiAnalysisService;
        this.kafkaTemplate = kafkaTemplate;
    }

    public void processTrafficData(CameraRawDTO rawData) {
        // 1. Gọi AI service để phân tích ảnh
        AiAnalysisResult analysisResult = aiAnalysisService.analyzeImage(rawData.getLiveviewUrl());
        if (analysisResult == null) {
            LOGGER.warn("AI analysis failed for camera {}. Skipping.", rawData.getId());
            return;
        }

        int vehicleCount = analysisResult.getTotalVehicles();
        String status = determineStatus(vehicleCount);

        EnrichedTrafficData.Analytics analytics = new EnrichedTrafficData.Analytics(vehicleCount, status);
        EnrichedTrafficData enrichedData = new EnrichedTrafficData(
                rawData.getId(),
                rawData.getName(),
                rawData.getTimestamp(),
                rawData.getLoc(),
                rawData.getLiveviewUrl(),
                analytics
        );

        LOGGER.info("Sending enriched data to Kafka topic '{}': {}", OUTPUT_TOPIC, enrichedData);
        kafkaTemplate.send(OUTPUT_TOPIC, rawData.getId(), enrichedData);
    }

    private String determineStatus(int vehicleCount) {
        if (vehicleCount < 20) {
            return "GREEN";
        } else if (vehicleCount <= 50) {
            return "YELLOW";
        } else {
            return "RED";
        }
    }
}