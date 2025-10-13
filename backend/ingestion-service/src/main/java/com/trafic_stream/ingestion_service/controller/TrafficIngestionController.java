package com.trafic_stream.ingestion_service.controller;

import com.trafic_stream.ingestion_service.dto.CameraRawDTO;
import com.trafic_stream.ingestion_service.service.KafkaProducerService;
import com.trafic_stream.ingestion_service.service.CameraApiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/traffic")
public class TrafficIngestionController {

    private final CameraApiService cameraApiService;
    private final KafkaProducerService producerService;
    public TrafficIngestionController(CameraApiService cameraApiService,
                                      KafkaProducerService producerService) {
        this.cameraApiService = cameraApiService;
        this.producerService = producerService;
    }

    @PostMapping("/ingest")
    public ResponseEntity<String> ingestTrafficData(@RequestBody CameraRawDTO data) {
        producerService.sendTrafficData(data);
        return ResponseEntity.ok("Dữ liệu giao thông từ camera "
                + data.getId() + " đã được gửi vào hàng đợi xử lý.");
    }

    @GetMapping("/fetch")
    public ResponseEntity<String> fetchFromExternalApi() {
        cameraApiService.fetchAndSend();
        return ResponseEntity.ok("Fetched data from external API and pushed to Kafka.");
    }

    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }
}


