package com.traffic_stream.dashboard.entity;

import com.traffic_stream.dashboard.shared.constant.ReportJobStatus;
import com.vladmihalcea.hibernate.type.json.JsonType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.Type;

import java.time.Instant;
import java.util.List;

@Entity
@Data
@Table(name = "report_job")
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    private Instant startTime;
    private Instant endTime;

    private Integer intervalMinutes;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> districts;

    @Type(JsonType.class)
    @Column(columnDefinition = "jsonb")
    private List<String> cameras;

    @Enumerated(EnumType.STRING)
    private ReportJobStatus status;

    @Column(columnDefinition = "text")
    private String fileUrl;

    private Instant createdAt;
    private Instant executeAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = Instant.now();
    }
}

