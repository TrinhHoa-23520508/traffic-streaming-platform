package com.trafic_stream.ingestion_service.service;

import com.trafic_stream.ingestion_service.config.KafkaTopicConfig;
import com.trafic_stream.ingestion_service.dto.CameraRawDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import com.trafic_stream.ingestion_service.config.ExternalApiProperties;
import org.springframework.scheduling.annotation.Scheduled;

@Service
public class CameraApiService {

    private final RestTemplate restTemplate;
    private final ExternalApiProperties apiProperties;
    private final KafkaProducerService producerService;

    public CameraApiService(ExternalApiProperties apiProperties,
                            KafkaProducerService producerService) {
        this.restTemplate = new RestTemplate();
        this.apiProperties = apiProperties;
        this.producerService = producerService;
    }

    public void fetchAndSend() {
        CameraRawDTO[] cameras = restTemplate.getForObject(
                apiProperties.getUrl(),
                CameraRawDTO[].class
        );

        if (cameras != null) {
            for (CameraRawDTO cam : cameras) {
                producerService.sendTrafficData(cam);
            }
        }
    }

    @Scheduled(fixedRate = 12000)
    public void scheduleFetchAndSend() {
        fetchAndSend();
    }
}
