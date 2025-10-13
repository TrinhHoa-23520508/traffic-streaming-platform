package com.traffic_stream.dashboard.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

@Configuration
public class JacksonConfig {

    @Bean
    @Primary // Đánh dấu đây là ObjectMapper chính của toàn bộ ứng dụng
    public ObjectMapper objectMapper() {
        ObjectMapper objectMapper = new ObjectMapper();

        // Đăng ký module để hỗ trợ các kiểu thời gian của Java 8+
        objectMapper.registerModule(new JavaTimeModule());

        // Cấu hình quan trọng: không ghi ngày tháng dưới dạng timestamp (số mili giây)
        // mà ghi dưới dạng chuỗi ISO-8601 (ví dụ: "2025-10-13T10:30:00Z")
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        return objectMapper;
    }
}