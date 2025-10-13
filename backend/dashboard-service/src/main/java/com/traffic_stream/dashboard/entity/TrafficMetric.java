package com.traffic_stream.dashboard.entity;

import com.vladmihalcea.hibernate.type.json.JsonType;
import jakarta.persistence.*;
        import lombok.Data;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.Map;

@Entity
@Data
@Table(name = "traffic_metrics")
public class TrafficMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "area_id")
    private String areaId;
    private String imageName;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private Map<String, Integer> vehicleCounts;

    private int totalVehicles;
    private String trafficDensity;
    private Instant timestamp;
}
