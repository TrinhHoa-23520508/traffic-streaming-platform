package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.dto.DashboardUpdateDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Service
@Slf4j
@RequiredArgsConstructor
public class HourlyReportScheduler {

    private final TrafficService trafficService;
    private final SimpMessagingTemplate ws;

    /**
     * Chạy mỗi 1 PHÚT
     * Thêm @Async để chạy trên luồng riêng, tránh block hệ thống
     */
    @Async
    @Scheduled(cron = "0 * * * * *")
    public void sendDashboardUpdate() {
        try {
            long startTime = System.currentTimeMillis();

            Instant now = Instant.now().minus(2, ChronoUnit.MINUTES);
            Instant recentStart = now.minus(59, ChronoUnit.SECONDS); 

            DashboardUpdateDTO updateData = DashboardUpdateDTO.builder()
                    .hourlySummary(trafficService.getDetailedHourlySummaryByDistrict(recentStart, now))
                    .fastestGrowing(trafficService.getTop5FastestGrowingDistricts())
                    .vehicleRatio(trafficService.getCityWideVehicleTypeRatio())
                    .busiestDistricts(trafficService.getTop5BusiestDistricts())
                    .busiestCameras(trafficService.getTop5BusiestCameras())
                    .timestamp(System.currentTimeMillis())
                    .build();

            ws.convertAndSend("/topic/dashboard-update", updateData);

            log.info("Đã gửi gói tin Dashboard Update (Time: {}ms)", System.currentTimeMillis() - startTime);

        } catch (Exception e) {
            log.error("Lỗi khi gửi Dashboard Update: ", e);
        }
    }
}