package com.trafic_stream.ingestion_service.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaTopicConfig {

    public static final String TRAFFIC_TOPIC = "hcm_traffic_data";
    public static final String TRAFFIC_METRICS_TOPIC = "traffic_metrics_topic";

    @Bean
    public NewTopic trafficTopic() {
        return TopicBuilder.name(TRAFFIC_TOPIC)
                .partitions(6)
                .replicas(1)
                .build();
    }

    @Bean
    public NewTopic trafficMetricsTopic() {
        return TopicBuilder.name(TRAFFIC_METRICS_TOPIC)
                .partitions(6)
                .replicas(1)
                .build();
    }
}