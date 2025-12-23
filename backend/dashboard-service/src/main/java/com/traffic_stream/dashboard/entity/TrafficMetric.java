package com.traffic_stream.dashboard.entity;

import com.vladmihalcea.hibernate.type.json.JsonType;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Entity
@Data
@Table(name = "traffic_metrics")
public class TrafficMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "camera_id")
    private String cameraId;

    @Column(name = "camera_name")
    private String cameraName;

    @Column(name = "district") 
    private String district;

    @Column(name = "annotated_image_url")
    private String annotatedImageUrl;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private List<Double> coordinates; 

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Integer> detectionDetails; 

    @Column(name = "total_count")
    private int totalCount;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", timezone = "Asia/Ho_Chi_Minh")
    @Column(name = "timestamp")
    private Instant timestamp;
}