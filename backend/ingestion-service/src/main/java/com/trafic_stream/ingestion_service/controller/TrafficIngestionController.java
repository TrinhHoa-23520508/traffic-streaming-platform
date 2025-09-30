package com.trafic_stream.ingestion_service.controller;


import com.trafic_stream.ingestion_service.dto.CameraDTO;
import com.trafic_stream.ingestion_service.service.KafkaProducerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/traffic")
public class TrafficIngestionController {
    private final KafkaProducerService producerService;

    public TrafficIngestionController(KafkaProducerService producerService) {
        this.producerService = producerService;
    }

    @PostMapping("/ingest")
    public ResponseEntity<String> ingestTrafficData(@RequestBody CameraDTO data) {
        producerService.sendTrafficData(data);
        return ResponseEntity.ok("Dữ liệu giao thông từ camera "
                + data.getCameraId() + " đã được gửi vào hàng đợi xử lý.");
    }


    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("pong");
    }

}


