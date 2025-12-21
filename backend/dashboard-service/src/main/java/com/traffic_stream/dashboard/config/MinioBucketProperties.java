package com.traffic_stream.dashboard.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "minio.bucket")
@Getter
@Setter
public class MinioBucketProperties {
    private String documents;
}
