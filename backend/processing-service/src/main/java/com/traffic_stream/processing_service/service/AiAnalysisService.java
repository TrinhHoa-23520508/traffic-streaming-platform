package com.traffic_stream.processing_service.service;

import com.traffic_stream.processing_service.dto.AiAnalysisResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

@Service
public class AiAnalysisService {
    private static final Logger LOGGER = LoggerFactory.getLogger(AiAnalysisService.class);
    private final RestTemplate restTemplate;

    @Value("${ai.service.url}")
    private String aiServiceUrl;

    public AiAnalysisService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public AiAnalysisResult analyzeImage(String imageUrl) {
        try {
            LOGGER.info("Sending image URL to AI service: {}", imageUrl);
            return restTemplate.postForObject(aiServiceUrl, Map.of("image_url", imageUrl), AiAnalysisResult.class);
        } catch (Exception e) {
            LOGGER.error("Error calling AI service for URL {}: {}", imageUrl, e.getMessage());
            return null;
        }
    }
}