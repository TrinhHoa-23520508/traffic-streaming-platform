package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.dto.HourlyDistrictSummaryDTO;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class HourlyReportScheduler {

    private static final Logger logger = LoggerFactory.getLogger(HourlyReportScheduler.class);
    private final TrafficService trafficService;
    private final SimpMessagingTemplate ws; //

    public HourlyReportScheduler(TrafficService trafficService, SimpMessagingTemplate ws) {
        this.trafficService = trafficService;
        this.ws = ws;
    }

    /**
     * Chạy vào 00 phút 00 giây của mỗi giờ.
     * (Ví dụ: 13:00:00, 14:00:00, ...)
     */
    @Scheduled(cron = "0 0 * * * *")
    public void sendHourlySummaryReport() {
        logger.info("Đang chạy tác vụ tổng hợp hằng giờ...");

        try {
            Instant endTime = Instant.now().truncatedTo(ChronoUnit.HOURS);
            Instant startTime = endTime.minus(1, ChronoUnit.HOURS);

            logger.info("Lấy dữ liệu tổng hợp từ {} đến {}", startTime, endTime);
            List<HourlyDistrictSummaryDTO> summaryList = trafficService.getDetailedHourlySummaryByDistrict(startTime, endTime);

            if (summaryList.isEmpty()) {
                logger.warn("Không có dữ liệu tổng hợp trong giờ qua.");
                return;
            }

            String topic = "/topic/hourly-summary-by-district";
            logger.info("Gửi {} bản ghi tổng hợp qua {}", summaryList.size(), topic);
            ws.convertAndSend(topic, summaryList);

        } catch (Exception e) {
            logger.error("Lỗi khi chạy tác vụ tổng hợp hằng giờ: " + e.getMessage(), e);
        }
    }
}