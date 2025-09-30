package com.trafic_stream.ingestion_service.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    public static final String TRAFFIC_TOPIC = "hcm_traffic_data";

    @Bean
    public NewTopic trafficTopic() {
        return TopicBuilder.name(TRAFFIC_TOPIC)
                .partitions(3)
                .replicas(1)
                .build();
    }
}