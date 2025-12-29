package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.dto.DashboardUpdateDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
public class HourlyReportScheduler {

    private static final Logger logger = LoggerFactory.getLogger(HourlyReportScheduler.class);
    private final TrafficService trafficService;
    private final SimpMessagingTemplate ws;

    public HourlyReportScheduler(TrafficService trafficService, SimpMessagingTemplate ws) {
        this.trafficService = trafficService;
        this.ws = ws;
    }

    /**
     * Chạy mỗi phút (giây thứ 00)
     * Gom tất cả dữ liệu Dashboard vào 1 topic duy nhất
     */
    @Scheduled(cron = "0 * * * * *")
    public void sendDashboardUpdate() {
        try {
            Instant now = Instant.now();
            Instant oneHourAgo = now.minus(1, ChronoUnit.HOURS);

            DashboardUpdateDTO updateData = DashboardUpdateDTO.builder()
                    .hourlySummary(trafficService.getDetailedHourlySummaryByDistrict(oneHourAgo, now))

                    .fastestGrowing(trafficService.getTop5FastestGrowingDistricts())

                    .vehicleRatio(trafficService.getCityWideVehicleTypeRatio())

                    .busiestDistricts(trafficService.getTop5BusiestDistricts())
                    .busiestCameras(trafficService.getTop5BusiestCameras())

                    .timestamp(System.currentTimeMillis())
                    .build();

            ws.convertAndSend("/topic/dashboard-update", updateData);

            logger.info("Đã gửi gói tin Dashboard Update (1p/lần)");

        } catch (Exception e) {
            logger.error("Lỗi khi gửi Dashboard Update: ", e);
        }
    }
}