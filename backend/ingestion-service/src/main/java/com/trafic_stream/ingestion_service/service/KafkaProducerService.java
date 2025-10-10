package com.trafic_stream.ingestion_service.service;

import com.trafic_stream.ingestion_service.config.KafkaTopicConfig;
import com.trafic_stream.ingestion_service.dto.CameraRawDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaProducerService {

    private static final Logger LOGGER = LoggerFactory.getLogger(KafkaProducerService.class);

    private final KafkaTemplate<String, CameraRawDTO> kafkaTemplate;

    public KafkaProducerService(KafkaTemplate<String, CameraRawDTO> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendTrafficData(CameraRawDTO data) {
        String key = data.getId();
        data.setTimestamp(System.currentTimeMillis());
        LOGGER.info("Đang gửi dữ liệu camera {} vào Kafka topic {} ",
                key, KafkaTopicConfig.TRAFFIC_TOPIC);

        kafkaTemplate.send(KafkaTopicConfig.TRAFFIC_TOPIC, key, data)
                .whenComplete((result, ex) -> {
                    if (ex == null) {
                        LOGGER.info("Gửi thành công: topic={}, partition={}, offset={}",
                                result.getRecordMetadata().topic(),
                                result.getRecordMetadata().partition(),
                                result.getRecordMetadata().offset());
                    } else {
                        LOGGER.error("Lỗi khi gửi dữ liệu camera {} vào Kafka", key, ex);
                    }
                });
    }


}
