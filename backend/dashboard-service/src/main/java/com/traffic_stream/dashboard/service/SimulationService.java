package com.traffic_stream.dashboard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.traffic_stream.dashboard.dto.TrafficMetricsDTO;
import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.*;

@Service
public class SimulationService {

    @Value("${app.simulate:false}")
    private boolean simulate;

    private KafkaProducer<String, String> producer;
    private final ObjectMapper mapper;
    private Timer timer;
    private final Random random = new Random();

    private final List<String> areaIds = List.of(
            "area_1", "area_2", "area_3", "area_4", "area_5"
    );

    @Autowired
    public SimulationService(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @PostConstruct
    public void init() {
        if (!simulate) return;

        // Kafka producer config
        Properties props = new Properties();
        props.put("bootstrap.servers", System.getenv().getOrDefault("KAFKA_BOOTSTRAP_SERVERS", "broker:29092"));
        props.put("key.serializer", "org.apache.kafka.common.serialization.StringSerializer");
        props.put("value.serializer", "org.apache.kafka.common.serialization.StringSerializer");

        producer = new KafkaProducer<>(props);

        // Timer: gửi mỗi 15 giây
        timer = new Timer();
        timer.scheduleAtFixedRate(new TimerTask() {
            @Override
            public void run() {
                sendSample500Cameras();
            }
        }, 2000, 15000); // Delay 2s, interval 15s
    }

    private void sendSample500Cameras() {
        for (int i = 1; i <= 500; i++) {
            try {
                TrafficMetricsDTO dto = new TrafficMetricsDTO();

                // Camera và ảnh
                String cameraId = "cam_" + i;
                dto.setImageName("sim/" + cameraId + "/img.jpg");

                // AreaId ngẫu nhiên
                String areaId = areaIds.get(random.nextInt(areaIds.size()));
                dto.setAreaId(areaId);

                // Vehicle counts ngẫu nhiên
                Map<String, Integer> vehicleCounts = Map.of(
                        "car", random.nextInt(20),
                        "truck", random.nextInt(5),
                        "bus", random.nextInt(3),
                        "motorcycle", random.nextInt(15)
                );
                dto.setVehicleCounts(vehicleCounts);

                // Tổng số xe và traffic density
                int total = vehicleCounts.values().stream().mapToInt(Integer::intValue).sum();
                dto.setTotalVehicles(total);
                dto.setTrafficDensity(total < 10 ? "low" : (total < 30 ? "medium" : "high"));

                dto.setTimestamp(Instant.now());

                // Gửi Kafka
                String json = mapper.writeValueAsString(dto);
                producer.send(new ProducerRecord<>("traffic_metrics_topic", dto.getImageName(), json));

                System.out.println("[SIMULATION] Sent fake metric: " + json);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }

    @PreDestroy
    public void stop() {
        if (timer != null) timer.cancel();
        if (producer != null) producer.close();
    }
}
