package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.dto.report.ReportAnalysisDTO;
import com.traffic_stream.dashboard.dto.report.ReportAnalysisDTO.*;
import com.traffic_stream.dashboard.entity.ReportJob;
import com.traffic_stream.dashboard.shared.utils.MinioEndpointUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service tạo báo cáo PDF đầy đủ theo yêu cầu
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PdfReportService {

    private final PdfBuilderService pdfBuilder;
    private final MinioEndpointUtils minioEndpointUtils;
    private int currentPageNumber = 1;

    public File generatePdfReport(ReportJob job, ReportAnalysisDTO analysis) throws IOException {
        log.info("Generating comprehensive PDF report for job {}", job.getId());

        PDDocument document = new PDDocument();
        currentPageNumber = 1;

        try {
            // Initialize fonts with Unicode support (for Vietnamese)
            pdfBuilder.initializeFonts(document);
            log.info("Fonts initialized for document");

            // Cover Page
            addCoverPage(document, analysis);

            // I. Thông tin báo cáo
            addReportInfoSection(document, analysis);

            // II. Tổng hợp hệ thống
            addSystemSummarySection(document, analysis);

            // III. Phân tích theo quận
            addDistrictAnalysisSection(document, analysis);

            // IV. Phân tích theo camera
            addCameraAnalysisSection(document, analysis);

            // V. Phân tích theo thời gian
            addTimelineAnalysisSection(document, analysis);

            // VI. Phân tích loại phương tiện
            addVehicleTypeAnalysisSection(document, analysis);

            // VII. Sự kiện bất thường
            addAnomalySection(document, analysis);

            // VIII. Minh họa (Annotated Images)
            addAnnotatedImagesSection(document, analysis);

            // IX. Kết luận & Kiến nghị
            addConclusionSection(document, analysis);

            // Save to temp file
            File tempFile = File.createTempFile("traffic_report_" + job.getId() + "_", ".pdf");
            document.save(tempFile);

            log.info("PDF report saved to {}", tempFile.getAbsolutePath());
            return tempFile;

        } finally {
            document.close();
        }
    }

    // ========== COVER PAGE ==========

    private void addCoverPage(PDDocument document, ReportAnalysisDTO analysis) throws IOException {
        PDPage page = pdfBuilder.createNewPage(document);
        PDPageContentStream content = new PDPageContentStream(document, page);

        try {
            // Title
            float y = 650;
            content.setNonStrokingColor(41/255f, 128/255f, 185/255f);
            pdfBuilder.drawBoldText(content, "BÁO CÁO GIAO THÔNG TỰ ĐỘNG", 100, y, 24);

            y -= 40;
            content.setNonStrokingColor(0, 0, 0);
            pdfBuilder.drawBoldText(content, analysis.getReportTitle(), 100, y, 20);

            y -= 60;
            pdfBuilder.drawText(content, "Thời gian: " + pdfBuilder.formatDateTime(analysis.getStartTime()) +
                    " - " + pdfBuilder.formatDateTime(analysis.getEndTime()), 100, y, 12);

            y -= 30;
            pdfBuilder.drawText(content, "Số camera phân tích: " + analysis.getTotalCameras(), 100, y, 12);
            y -= 20;
            pdfBuilder.drawText(content, "Tổng số phương tiện: " + pdfBuilder.formatNumber(analysis.getTotalVehicles()), 100, y, 12);

            y -= 60;
            pdfBuilder.drawText(content, "Báo cáo được tạo tự động bởi hệ thống Traffic Streaming Platform", 100, y, 10);
            pdfBuilder.drawText(content, "Ngày tạo: " + pdfBuilder.formatDateTime(Instant.now()), 100, y - 20, 10);

        } finally {
            content.close();
        }
        currentPageNumber++;
    }

    // ========== I. THÔNG TIN BÁO CÁO ==========

    private void addReportInfoSection(PDDocument document, ReportAnalysisDTO analysis) throws IOException {
        PDPage page = pdfBuilder.createNewPage(document);
        PDPageContentStream content = new PDPageContentStream(document, page);

        try {
            pdfBuilder.drawHeader(content, "I. THÔNG TIN BÁO CÁO", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Thông tin chung", 720);

            y = pdfBuilder.drawKeyValue(content, "Tên báo cáo", analysis.getReportTitle(), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Thời gian bắt đầu", pdfBuilder.formatDateTime(analysis.getStartTime()), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Thời gian kết thúc", pdfBuilder.formatDateTime(analysis.getEndTime()), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Khoảng tổng hợp", analysis.getIntervalMinutes() + " phút", 70, y);

            y -= 10;
            y = pdfBuilder.drawSectionHeader(content, "Thông tin camera", y);
            y = pdfBuilder.drawKeyValue(content, "Tổng số camera", analysis.getTotalCameras().toString(), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Camera hoạt động", analysis.getActiveCameras().toString(), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Camera offline", analysis.getOfflineCameras().toString(), 70, y);

        } finally {
            content.close();
        }
    }

    // ========== II. TỔNG HỢP HỆ THỐNG ==========

    private void addSystemSummarySection(PDDocument document, ReportAnalysisDTO analysis) throws IOException {
        PDPage page = pdfBuilder.createNewPage(document);
        PDPageContentStream content = new PDPageContentStream(document, page);

        try {
            pdfBuilder.drawHeader(content, "II. TỔNG HỢP HỆ THỐNG", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Tổng quan", 720);

            y = pdfBuilder.drawKeyValue(content, "Tổng số phương tiện",
                    pdfBuilder.formatNumber(analysis.getTotalVehicles()), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Trung bình xe/camera",
                    pdfBuilder.formatDouble(analysis.getAvgVehiclesPerCamera(), 1), 70, y);

            y -= 10;
            y = pdfBuilder.drawSectionHeader(content, "Xếp hạng", y);
            y = pdfBuilder.drawKeyValue(content, "Quận đông nhất", analysis.getBusiestDistrict(), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Quận vắng nhất", analysis.getQuietestDistrict(), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Camera đông nhất", analysis.getBusiestCamera(), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Camera vắng nhất", analysis.getQuietestCamera(), 70, y);

            // Pie chart for vehicle types
            if (analysis.getVehicleTypePercentages() != null && !analysis.getVehicleTypePercentages().isEmpty()) {
                y -= 20;
                y = pdfBuilder.drawSectionHeader(content, "Tỷ lệ loại phương tiện", y);

                PDImageXObject pieChart = pdfBuilder.createPieChart(document,
                        "Tỷ lệ loại phương tiện",
                        analysis.getVehicleTypePercentages());
                content.drawImage(pieChart, 100, y - 300, 400, 280);
            }

        } finally {
            content.close();
        }
    }

    // ========== III. PHÂN TÍCH THEO QUẬN ==========

    private void addDistrictAnalysisSection(PDDocument document, ReportAnalysisDTO analysis) throws IOException {
        PDPage page = pdfBuilder.createNewPage(document);
        PDPageContentStream content = new PDPageContentStream(document, page);

        try {
            pdfBuilder.drawHeader(content, "III. PHÂN TÍCH THEO QUẬN", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Bảng tổng hợp theo quận", 720);

            // Table
            String[] headers = {"Quận", "Tổng PT", "Tỷ lệ %", "Camera", "TB/Camera"};
            // Better distributed widths for readability
            float[] widths = {110, 85, 80, 70, 95};

            List<String[]> rows = analysis.getDistrictAnalyses().stream()
                    .limit(15)
                    .map(d -> new String[]{
                            d.getDistrictName(),
                            pdfBuilder.formatNumber(d.getTotalVehicles()),
                            pdfBuilder.formatDouble(d.getPercentage(), 1) + "%",
                            d.getActiveCameras().toString(),
                            pdfBuilder.formatDouble(d.getAvgVehiclesPerCamera(), 0)
                    })
                    .collect(Collectors.toList());

            y = pdfBuilder.drawTable(content, y, headers, rows, widths);

            // Bar chart
            if (y > 250 && analysis.getDistrictAnalyses().size() > 0) {
                y -= 20;
                Map<String, Long> chartData = analysis.getDistrictAnalyses().stream()
                        .limit(10)
                        .collect(Collectors.toMap(
                                DistrictAnalysis::getDistrictName,
                                DistrictAnalysis::getTotalVehicles,
                                (a, b) -> a,
                                LinkedHashMap::new
                        ));

                PDImageXObject barChart = pdfBuilder.createBarChart(document,
                        "Top 10 quận có lưu lượng cao nhất",
                        chartData);
                content.drawImage(barChart, 50, y - 280, 500, 250);
            }

        } finally {
            content.close();
        }
    }

    // ========== IV. PHÂN TÍCH THEO CAMERA ==========

    private void addCameraAnalysisSection(PDDocument document, ReportAnalysisDTO analysis) throws IOException {
        List<CameraAnalysis> cameras = analysis.getCameraAnalyses();

        // Page 1: Table
        PDPage page1 = pdfBuilder.createNewPage(document);
        PDPageContentStream content1 = new PDPageContentStream(document, page1);

        try {
            pdfBuilder.drawHeader(content1, "IV. PHÂN TÍCH THEO CAMERA", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content1, "Bảng tổng hợp camera", 720);

            String[] headers = {"Camera ID", "Tên", "Quận", "Tổng PT", "TB", "Trạng thái"};
            // Adjusted widths: reduced Camera ID, increased name column, optimized others
            float[] widths = {65, 150, 70, 65, 45, 65};

            List<String[]> rows = cameras.stream()
                    .limit(20)
                    .map(c -> new String[]{
                            c.getCameraId(),
                            c.getCameraName(),
                            c.getDistrict(),
                            pdfBuilder.formatNumber(c.getTotalVehicles()),
                            pdfBuilder.formatDouble(c.getAvgVehicles(), 0),
                            c.getIsActive() ? "Hoạt động" : "Offline"
                    })
                    .collect(Collectors.toList());

            pdfBuilder.drawTable(content1, y, headers, rows, widths);

        } finally {
            content1.close();
        }

        // Page 2: Chart
        PDPage page2 = pdfBuilder.createNewPage(document);
        PDPageContentStream content2 = new PDPageContentStream(document, page2);

        try {
            pdfBuilder.drawHeader(content2, "IV. PHÂN TÍCH THEO CAMERA (tt)", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content2, "Top 15 camera đông nhất", 720);

            Map<String, Long> chartData = cameras.stream()
                    .limit(15)
                    .collect(Collectors.toMap(
                            CameraAnalysis::getCameraId,
                            CameraAnalysis::getTotalVehicles,
                            (a, b) -> a,
                            LinkedHashMap::new
                    ));

            PDImageXObject barChart = pdfBuilder.createBarChart(document,
                    "Top camera có lưu lượng cao nhất",
                    chartData);
            content2.drawImage(barChart, 50, y - 280, 500, 250);

            // Anomaly cameras
            y -= 300;
            y = pdfBuilder.drawSectionHeader(content2, "Camera bất thường", y);

            List<String> anomalyCameras = cameras.stream()
                    .filter(CameraAnalysis::getHasAnomaly)
                    .limit(10)
                    .map(c -> c.getCameraId() + " - " + c.getCameraName() + " (" + c.getAnomalyType() + ")")
                    .collect(Collectors.toList());

            if (anomalyCameras.isEmpty()) {
                pdfBuilder.drawText(content2, "Không phát hiện bất thường", 70, y, 10);
            } else {
                pdfBuilder.drawBulletList(content2, anomalyCameras, 70, y);
            }

        } finally {
            content2.close();
        }
    }

    // ========== V. PHÂN TÍCH THEO THỜI GIAN ==========

    private void addTimelineAnalysisSection(PDDocument document, ReportAnalysisDTO analysis) throws IOException {
        PDPage page = pdfBuilder.createNewPage(document);
        PDPageContentStream content = new PDPageContentStream(document, page);

        try {
            pdfBuilder.drawHeader(content, "V. PHÂN TÍCH THEO THỜI GIAN", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Cao điểm và thấp điểm", 720);

            if (analysis.getPeakHour() != null) {
                y = pdfBuilder.drawKeyValue(content, "Giờ cao điểm",
                        pdfBuilder.formatDateTime(analysis.getPeakHour()), 70, y);
                y = pdfBuilder.drawKeyValue(content, "Lưu lượng cao điểm",
                        pdfBuilder.formatNumber(analysis.getPeakHourVolume()) + " phương tiện", 70, y);
            }

            if (analysis.getOffPeakHour() != null) {
                y = pdfBuilder.drawKeyValue(content, "Giờ thấp điểm",
                        pdfBuilder.formatDateTime(analysis.getOffPeakHour()), 70, y);
                y = pdfBuilder.drawKeyValue(content, "Lưu lượng thấp điểm",
                        pdfBuilder.formatNumber(analysis.getOffPeakHourVolume()) + " phương tiện", 70, y);
            }

            // Timeline chart
            if (analysis.getTimelineData() != null && !analysis.getTimelineData().isEmpty()) {
                y -= 20;
                y = pdfBuilder.drawSectionHeader(content, "Biểu đồ timeline", y);

                Map<String, Long> timelineChart = analysis.getTimelineData().stream()
                        .collect(Collectors.toMap(
                                t -> pdfBuilder.formatTime(t.getTimestamp()),
                                TimelineData::getTotalVehicles,
                                (a, b) -> a,
                                LinkedHashMap::new
                        ));

                PDImageXObject lineChart = pdfBuilder.createLineChart(document,
                        "Lưu lượng theo thời gian",
                        timelineChart);
                content.drawImage(lineChart, 50, y - 230, 500, 220);
            }

        } finally {
            content.close();
        }
    }

    // ========== VI. PHÂN TÍCH LOẠI PHƯƠNG TIỆN ==========

    private void addVehicleTypeAnalysisSection(PDDocument document, ReportAnalysisDTO analysis) throws IOException {
        PDPage page = pdfBuilder.createNewPage(document);
        PDPageContentStream content = new PDPageContentStream(document, page);

        try {
            pdfBuilder.drawHeader(content, "VI. PHÂN TÍCH LOẠI PHƯƠNG TIỆN", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Thống kê loại phương tiện", 720);

            if (analysis.getVehicleTypeCounts() != null) {
                String[] headers = {"Loại phương tiện", "Số lượng", "Tỷ lệ %"};
                float[] widths = {200, 120, 120};

                long total = analysis.getTotalVehicles();
                List<String[]> rows = analysis.getVehicleTypeCounts().entrySet().stream()
                        .map(e -> new String[]{
                                e.getKey(),
                                pdfBuilder.formatNumber(e.getValue()),
                                pdfBuilder.formatDouble((e.getValue() * 100.0) / total, 1) + "%"
                        })
                        .collect(Collectors.toList());

                y = pdfBuilder.drawTable(content, y, headers, rows, widths);

                // Bar chart
                if (y > 300) {
                    y -= 20;
                    PDImageXObject barChart = pdfBuilder.createBarChart(document,
                            "Phân bố loại phương tiện",
                            analysis.getVehicleTypeCounts());
                    content.drawImage(barChart, 50, y - 280, 500, 250);
                }
            }

        } finally {
            content.close();
        }
    }

    // ========== VII. SỰ KIỆN BẤT THƯỜNG ==========

    private void addAnomalySection(PDDocument document, ReportAnalysisDTO analysis) throws IOException {
        PDPage page = pdfBuilder.createNewPage(document);
        PDPageContentStream content = new PDPageContentStream(document, page);

        try {
            pdfBuilder.drawHeader(content, "VII. SỰ KIỆN BẤT THƯỜNG", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Camera offline", 720);

            if (analysis.getOfflineCameraList() != null && !analysis.getOfflineCameraList().isEmpty()) {
                pdfBuilder.drawBulletList(content, analysis.getOfflineCameraList(), 70, y);
                y -= (analysis.getOfflineCameraList().size() * 15 + 20);
            } else {
                y = pdfBuilder.drawText(content, "Không có camera offline", 70, y, 10);
                y -= 20;
            }

            y = pdfBuilder.drawSectionHeader(content, "Sự kiện bất thường", y);

            if (analysis.getAnomalies() != null && !analysis.getAnomalies().isEmpty()) {
                List<String> anomalyList = analysis.getAnomalies().stream()
                        .limit(15)
                        .map(a -> String.format("[%s] %s - %s: %s",
                                a.getType(),
                                a.getCameraId(),
                                a.getCameraName(),
                                a.getDescription()))
                        .collect(Collectors.toList());

                pdfBuilder.drawBulletList(content, anomalyList, 70, y);
            } else {
                pdfBuilder.drawText(content, "Không phát hiện sự kiện bất thường", 70, y, 10);
            }

        } finally {
            content.close();
        }
    }

    // ========== VIII. MINH HỌA ==========

    private void addAnnotatedImagesSection(PDDocument document, ReportAnalysisDTO analysis) throws IOException {
        if (analysis.getAnnotatedImages() == null || analysis.getAnnotatedImages().isEmpty()) {
            log.info("No annotated images to add to report");
            return;
        }

        List<AnnotatedImageInfo> images = analysis.getAnnotatedImages();
        log.info("Adding {} annotated images to report", images.size());

        int imagesPerPage = 4; // 2x2 grid (reduced for better quality)
        int totalPages = (int) Math.ceil((double) images.size() / imagesPerPage);

        for (int pageIdx = 0; pageIdx < totalPages; pageIdx++) {
            PDPage page = pdfBuilder.createNewPage(document);
            PDPageContentStream content = new PDPageContentStream(document, page);

            try {
                pdfBuilder.drawHeader(content, "VIII. MINH HỌA - ẢNH ANNOTATED", currentPageNumber++);

                // Add note about timestamp accuracy
                float noteY = 695;
                pdfBuilder.drawText(content,
                    "* Thời gian hiển thị là approximate, có thể chênh lệch 1-2 phút với thời gian trên ảnh",
                    60, noteY, 7);

                float y = 670; // Adjusted starting Y to accommodate note
                float imgWidth = 240;
                float imgHeight = 180;
                float spacingX = 20;
                float spacingY = 40;

                int startIdx = pageIdx * imagesPerPage;
                int endIdx = Math.min(startIdx + imagesPerPage, images.size());

                for (int i = startIdx; i < endIdx; i++) {
                    AnnotatedImageInfo img = images.get(i);
                    img.setImageUrl(minioEndpointUtils.toInternalUrl(img.getImageUrl()));

                    int row = (i - startIdx) / 2;
                    int col = (i - startIdx) % 2;

                    float x = 60 + col * (imgWidth + spacingX);
                    float imgY = y - row * (imgHeight + spacingY + 30);

                    // Draw image (with error handling)
                    boolean imageLoaded = pdfBuilder.drawImageFromUrl(
                        content, document, img.getImageUrl(),
                        x, imgY - imgHeight, imgWidth, imgHeight
                    );

                    // Draw caption below image
                    float captionY = imgY - imgHeight - 15;

                    // Camera info - truncate if too long
                    String cameraName = img.getCameraName() != null ? img.getCameraName() : img.getCameraId();
                    String cameraInfo = String.format("%s (%s)", cameraName, img.getCameraId());

                    // Truncate camera info if longer than image width
                    if (pdfBuilder.getTextWidth(cameraInfo, 9) > imgWidth) {
                        // Try shorter version without ID in parentheses
                        cameraInfo = cameraName;
                        if (pdfBuilder.getTextWidth(cameraInfo, 9) > imgWidth) {
                            // Still too long, truncate with ellipsis
                            cameraInfo = pdfBuilder.truncateText(cameraInfo, imgWidth - 10, 9) + "...";
                        }
                    }

                    pdfBuilder.drawText(content, cameraInfo, x, captionY, 9);

                    // Vehicle count and timestamp
                    // Note: Timestamp is from traffic metric record, may differ from actual image capture time
                    String details = String.format("%d phương tiện - ~%s",
                        img.getVehicleCount() != null ? img.getVehicleCount() : 0,
                        img.getTimestamp() != null ? pdfBuilder.formatTime(img.getTimestamp()) : "N/A"
                    );
                    pdfBuilder.drawText(content, details, x, captionY - 12, 8);

                    if (!imageLoaded) {
                        log.warn("Image not loaded for camera: {}", img.getCameraId());
                    }
                }

            } catch (Exception e) {
                log.error("Error adding annotated images page {}", pageIdx, e);
                // Continue with next page even if this one fails
            } finally {
                content.close();
            }
        }

        log.info("Completed adding annotated images section");
    }

    // ========== IX. KẾT LUẬN & KIẾN NGHỊ ==========

    private void addConclusionSection(PDDocument document, ReportAnalysisDTO analysis) throws IOException {
        PDPage page = pdfBuilder.createNewPage(document);
        PDPageContentStream content = new PDPageContentStream(document, page);

        try {
            pdfBuilder.drawHeader(content, "IX. KẾT LUẬN & KIẾN NGHỊ", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Kết luận và kiến nghị", 720);

            if (analysis.getConclusions() != null && !analysis.getConclusions().isEmpty()) {
                pdfBuilder.drawBulletList(content, analysis.getConclusions(), 70, y);
            } else {
                pdfBuilder.drawText(content, "Không có kết luận", 70, y, 10);
            }

            // Footer
            y = 100;
            pdfBuilder.drawText(content, "--- HẾT BÁO CÁO ---", 250, y, 12);
            pdfBuilder.drawText(content, "Hệ thống Traffic Streaming Platform", 200, y - 20, 10);

        } finally {
            content.close();
        }
    }
}

