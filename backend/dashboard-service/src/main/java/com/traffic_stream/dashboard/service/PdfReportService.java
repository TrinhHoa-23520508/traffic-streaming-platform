package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.dto.report.ReportAnalysisDTO;
import com.traffic_stream.dashboard.dto.report.ReportAnalysisDTO.*;
import com.traffic_stream.dashboard.entity.ReportJob;
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
            pdfBuilder.drawBoldText(content, "BAO CAO GIAO THONG TU DONG", 100, y, 24);

            y -= 40;
            content.setNonStrokingColor(0, 0, 0);
            pdfBuilder.drawBoldText(content, analysis.getReportTitle(), 100, y, 20);

            y -= 60;
            pdfBuilder.drawText(content, "Thoi gian: " + pdfBuilder.formatDateTime(analysis.getStartTime()) +
                    " - " + pdfBuilder.formatDateTime(analysis.getEndTime()), 100, y, 12);

            y -= 30;
            pdfBuilder.drawText(content, "So camera phan tich: " + analysis.getTotalCameras(), 100, y, 12);
            y -= 20;
            pdfBuilder.drawText(content, "Tong so phuong tien: " + pdfBuilder.formatNumber(analysis.getTotalVehicles()), 100, y, 12);

            y -= 60;
            pdfBuilder.drawText(content, "Bao cao duoc tao tu dong boi he thong Traffic Streaming Platform", 100, y, 10);
            pdfBuilder.drawText(content, "Ngay tao: " + pdfBuilder.formatDateTime(Instant.now()), 100, y - 20, 10);

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
            pdfBuilder.drawHeader(content, "I. THONG TIN BAO CAO", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Thong tin chung", 720);

            y = pdfBuilder.drawKeyValue(content, "Ten bao cao", analysis.getReportTitle(), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Thoi gian bat dau", pdfBuilder.formatDateTime(analysis.getStartTime()), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Thoi gian ket thuc", pdfBuilder.formatDateTime(analysis.getEndTime()), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Khoang tong hop", analysis.getIntervalMinutes() + " phut", 70, y);

            y -= 10;
            y = pdfBuilder.drawSectionHeader(content, "Thong tin camera", y);
            y = pdfBuilder.drawKeyValue(content, "Tong so camera", analysis.getTotalCameras().toString(), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Camera hoat dong", analysis.getActiveCameras().toString(), 70, y);
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
            pdfBuilder.drawHeader(content, "II. TONG HOP HE THONG", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Tong quan", 720);

            y = pdfBuilder.drawKeyValue(content, "Tong so phuong tien",
                    pdfBuilder.formatNumber(analysis.getTotalVehicles()), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Trung binh xe/camera",
                    pdfBuilder.formatDouble(analysis.getAvgVehiclesPerCamera(), 1), 70, y);

            y -= 10;
            y = pdfBuilder.drawSectionHeader(content, "Xep hang", y);
            y = pdfBuilder.drawKeyValue(content, "Quan dong nhat", analysis.getBusiestDistrict(), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Quan vang nhat", analysis.getQuietestDistrict(), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Camera dong nhat", analysis.getBusiestCamera(), 70, y);
            y = pdfBuilder.drawKeyValue(content, "Camera vang nhat", analysis.getQuietestCamera(), 70, y);

            // Pie chart for vehicle types
            if (analysis.getVehicleTypePercentages() != null && !analysis.getVehicleTypePercentages().isEmpty()) {
                y -= 20;
                y = pdfBuilder.drawSectionHeader(content, "Ty le loai phuong tien", y);

                PDImageXObject pieChart = pdfBuilder.createPieChart(document,
                        "Ty le loai phuong tien",
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
            pdfBuilder.drawHeader(content, "III. PHAN TICH THEO QUAN", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Bang tong hop theo quan", 720);

            // Table
            String[] headers = {"Quan", "Tong PT", "Ty le %", "Camera", "TB/Camera"};
            float[] widths = {120, 80, 80, 70, 90};

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
                        "Top 10 quan co luu luong cao nhat",
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
            pdfBuilder.drawHeader(content1, "IV. PHAN TICH THEO CAMERA", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content1, "Bang tong hop camera", 720);

            String[] headers = {"Camera ID", "Ten", "Quan", "Tong PT", "TB", "Trang thai"};
            float[] widths = {80, 100, 80, 70, 60, 70};

            List<String[]> rows = cameras.stream()
                    .limit(20)
                    .map(c -> new String[]{
                            c.getCameraId(),
                            c.getCameraName(),
                            c.getDistrict(),
                            pdfBuilder.formatNumber(c.getTotalVehicles()),
                            pdfBuilder.formatDouble(c.getAvgVehicles(), 0),
                            c.getIsActive() ? "Hoat dong" : "Offline"
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
            pdfBuilder.drawHeader(content2, "IV. PHAN TICH THEO CAMERA (tt)", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content2, "Top 15 camera dong nhat", 720);

            Map<String, Long> chartData = cameras.stream()
                    .limit(15)
                    .collect(Collectors.toMap(
                            CameraAnalysis::getCameraId,
                            CameraAnalysis::getTotalVehicles,
                            (a, b) -> a,
                            LinkedHashMap::new
                    ));

            PDImageXObject barChart = pdfBuilder.createBarChart(document,
                    "Top camera co luu luong cao nhat",
                    chartData);
            content2.drawImage(barChart, 50, y - 280, 500, 250);

            // Anomaly cameras
            y -= 300;
            y = pdfBuilder.drawSectionHeader(content2, "Camera bat thuong", y);

            List<String> anomalyCameras = cameras.stream()
                    .filter(CameraAnalysis::getHasAnomaly)
                    .limit(10)
                    .map(c -> c.getCameraId() + " - " + c.getCameraName() + " (" + c.getAnomalyType() + ")")
                    .collect(Collectors.toList());

            if (anomalyCameras.isEmpty()) {
                pdfBuilder.drawText(content2, "Khong phat hien bat thuong", 70, y, 10);
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
            pdfBuilder.drawHeader(content, "V. PHAN TICH THEO THOI GIAN", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Cao diem va thap diem", 720);

            if (analysis.getPeakHour() != null) {
                y = pdfBuilder.drawKeyValue(content, "Gio cao diem",
                        pdfBuilder.formatDateTime(analysis.getPeakHour()), 70, y);
                y = pdfBuilder.drawKeyValue(content, "Luu luong cao diem",
                        pdfBuilder.formatNumber(analysis.getPeakHourVolume()) + " phuong tien", 70, y);
            }

            if (analysis.getOffPeakHour() != null) {
                y = pdfBuilder.drawKeyValue(content, "Gio thap diem",
                        pdfBuilder.formatDateTime(analysis.getOffPeakHour()), 70, y);
                y = pdfBuilder.drawKeyValue(content, "Luu luong thap diem",
                        pdfBuilder.formatNumber(analysis.getOffPeakHourVolume()) + " phuong tien", 70, y);
            }

            // Timeline chart
            if (analysis.getTimelineData() != null && !analysis.getTimelineData().isEmpty()) {
                y -= 20;
                y = pdfBuilder.drawSectionHeader(content, "Bieu do timeline", y);

                Map<String, Long> timelineChart = analysis.getTimelineData().stream()
                        .collect(Collectors.toMap(
                                t -> pdfBuilder.formatTime(t.getTimestamp()),
                                TimelineData::getTotalVehicles,
                                (a, b) -> a,
                                LinkedHashMap::new
                        ));

                PDImageXObject lineChart = pdfBuilder.createLineChart(document,
                        "Luu luong theo thoi gian",
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
            pdfBuilder.drawHeader(content, "VI. PHAN TICH LOAI PHUONG TIEN", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Thong ke loai phuong tien", 720);

            if (analysis.getVehicleTypeCounts() != null) {
                String[] headers = {"Loai phuong tien", "So luong", "Ty le %"};
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
                            "Phan bo loai phuong tien",
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
            pdfBuilder.drawHeader(content, "VII. SU KIEN BAT THUONG", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Camera offline", 720);

            if (analysis.getOfflineCameraList() != null && !analysis.getOfflineCameraList().isEmpty()) {
                pdfBuilder.drawBulletList(content, analysis.getOfflineCameraList(), 70, y);
                y -= (analysis.getOfflineCameraList().size() * 15 + 20);
            } else {
                y = pdfBuilder.drawText(content, "Khong co camera offline", 70, y, 10);
                y -= 20;
            }

            y = pdfBuilder.drawSectionHeader(content, "Su kien bat thuong", y);

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
                pdfBuilder.drawText(content, "Khong phat hien su kien bat thuong", 70, y, 10);
            }

        } finally {
            content.close();
        }
    }

    // ========== VIII. MINH HỌA ==========

    private void addAnnotatedImagesSection(PDDocument document, ReportAnalysisDTO analysis) throws IOException {
        if (analysis.getAnnotatedImages() == null || analysis.getAnnotatedImages().isEmpty()) {
            return;
        }

        List<AnnotatedImageInfo> images = analysis.getAnnotatedImages();
        int imagesPerPage = 6; // 3x2 grid
        int totalPages = (int) Math.ceil((double) images.size() / imagesPerPage);

        for (int pageIdx = 0; pageIdx < totalPages; pageIdx++) {
            PDPage page = pdfBuilder.createNewPage(document);
            PDPageContentStream content = new PDPageContentStream(document, page);

            try {
                pdfBuilder.drawHeader(content, "VIII. MINH HOA - ANH ANNOTATED", currentPageNumber++);

                float y = 700;
                float imgWidth = 230;
                float imgHeight = 170;
                float spacing = 20;

                int startIdx = pageIdx * imagesPerPage;
                int endIdx = Math.min(startIdx + imagesPerPage, images.size());

                for (int i = startIdx; i < endIdx; i++) {
                    AnnotatedImageInfo img = images.get(i);

                    int row = (i - startIdx) / 2;
                    int col = (i - startIdx) % 2;

                    float x = 60 + col * (imgWidth + spacing);
                    float imgY = y - row * (imgHeight + 60);

                    // Draw image
                    pdfBuilder.drawImageFromUrl(content, document, img.getImageUrl(), x, imgY - imgHeight, imgWidth, imgHeight);

                    // Draw caption
                    content.beginText();
                    content.newLineAtOffset(x, imgY - imgHeight - 15);
                    content.setFont(new org.apache.pdfbox.pdmodel.font.PDType1Font(org.apache.pdfbox.pdmodel.font.Standard14Fonts.FontName.HELVETICA), 8);
                    content.showText(img.getCameraId() + " - " + img.getVehicleCount() + " xe");
                    content.endText();
                }

            } finally {
                content.close();
            }
        }
    }

    // ========== IX. KẾT LUẬN & KIẾN NGHỊ ==========

    private void addConclusionSection(PDDocument document, ReportAnalysisDTO analysis) throws IOException {
        PDPage page = pdfBuilder.createNewPage(document);
        PDPageContentStream content = new PDPageContentStream(document, page);

        try {
            pdfBuilder.drawHeader(content, "IX. KET LUAN & KIEN NGHI", currentPageNumber++);
            float y = pdfBuilder.drawSectionHeader(content, "Ket luan va kien nghi", 720);

            if (analysis.getConclusions() != null && !analysis.getConclusions().isEmpty()) {
                pdfBuilder.drawBulletList(content, analysis.getConclusions(), 70, y);
            } else {
                pdfBuilder.drawText(content, "Khong co ket luan", 70, y, 10);
            }

            // Footer
            y = 100;
            pdfBuilder.drawText(content, "--- HET BAO CAO ---", 250, y, 12);
            pdfBuilder.drawText(content, "He thong Traffic Streaming Platform", 200, y - 20, 10);

        } finally {
            content.close();
        }
    }
}

