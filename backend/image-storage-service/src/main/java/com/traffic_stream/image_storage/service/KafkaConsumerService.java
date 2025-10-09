package com.traffic_stream.image_storage.service;

import com.traffic_stream.image_storage.dto.CameraRawDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class KafkaConsumerService {

    private static final Logger LOGGER = LoggerFactory.getLogger(KafkaConsumerService.class);
    private final ImageService imageService;

    public KafkaConsumerService(ImageService imageService) {
        this.imageService = imageService;
    }

    @KafkaListener(topics = "hcm_traffic_data", groupId = "${spring.kafka.consumer.group-id}")
    public void consume(CameraRawDTO cameraData) {
        LOGGER.info("Nhận được dữ liệu từ camera: {} ({})", cameraData.getId(), cameraData.getName());

        try {
            String liveviewUrl = cameraData.getLiveviewUrl();

            if (liveviewUrl != null && !liveviewUrl.isEmpty()) {
                LOGGER.info("Xử lý hình ảnh từ camera {} ({}): {}",
                        cameraData.getId(),
                        cameraData.getName(),
                        liveviewUrl);

                // Sử dụng streaming để tải và lưu ảnh
                imageService.streamAndStoreImage(
                        cameraData.getId(),
                        cameraData.getName(),
                        liveviewUrl,
                        cameraData.getTimestamp());
            } else {
                LOGGER.warn("Camera {} ({}) không có URL hình ảnh",
                        cameraData.getId(), cameraData.getName());
            }
        } catch (Exception e) {
            LOGGER.error("Lỗi khi xử lý dữ liệu camera {} ({}): {}",
                    cameraData.getId(),
                    cameraData.getName(),
                    e.getMessage(), e);
        }
    }
}