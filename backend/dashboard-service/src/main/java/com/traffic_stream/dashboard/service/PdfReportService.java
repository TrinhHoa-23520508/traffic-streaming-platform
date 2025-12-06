package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.dto.report.ReportSummaryDTO;
import com.traffic_stream.dashboard.entity.ReportJob;
import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
public class PdfReportService {

    private static final DateTimeFormatter DATE_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    public File generatePdfReport(ReportJob job, List<ReportSummaryDTO> summary) throws IOException {
        log.info("Generating PDF report for job {}", job.getId());

        PDDocument document = new PDDocument();
        try {
            // Load Unicode font that supports Vietnamese
            PDFont font = loadVietnameseFont(document);

            // Header Page
            addHeaderPage(document, job, font);

            // Summary Pages
            for (ReportSummaryDTO districtSummary : summary) {
                addSummaryPage(document, job, districtSummary, font);
            }

            // Save to temp file
            File tempFile = File.createTempFile("report_" + job.getId() + "_", ".pdf");
            document.save(tempFile);

            log.info("PDF report saved to {}", tempFile.getAbsolutePath());
            return tempFile;

        } finally {
            document.close();
        }
    }

    /**
     * Load a font that supports Vietnamese characters
     */
    private PDFont loadVietnameseFont(PDDocument document) throws IOException {
        try {
            // Try to load DejaVu Sans font (supports Vietnamese)
            InputStream fontStream = getClass().getResourceAsStream("/fonts/DejaVuSans.ttf");
            if (fontStream != null) {
                log.info("Loading DejaVu Sans font from resources");
                return PDType0Font.load(document, fontStream);
            }
        } catch (Exception e) {
            log.warn("Failed to load custom font from resources: {}", e.getMessage());
        }

        // Fallback: Use system font that supports Unicode
        try {
            // Try common system fonts that support Vietnamese
            String[] fontPaths = {
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",  // Linux
                "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",  // macOS
                "C:/Windows/Fonts/arial.ttf",  // Windows Arial
                "C:/Windows/Fonts/tahoma.ttf"  // Windows Tahoma
            };

            for (String fontPath : fontPaths) {
                File fontFile = new File(fontPath);
                if (fontFile.exists()) {
                    log.info("Loading system font: {}", fontPath);
                    return PDType0Font.load(document, fontFile);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to load system font: {}", e.getMessage());
        }

        // Last resort: Use LiberationSans (included in PDFBox)
        log.warn("Using fallback LiberationSans font");
        InputStream liberationFont = getClass().getResourceAsStream("/org/apache/pdfbox/resources/ttf/LiberationSans-Regular.ttf");
        if (liberationFont != null) {
            return PDType0Font.load(document, liberationFont);
        }

        throw new IOException("Cannot load any font that supports Vietnamese characters");
    }

    private void addHeaderPage(PDDocument document, ReportJob job, PDFont font) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);

        try (PDPageContentStream content = new PDPageContentStream(document, page)) {
            float yPosition = 750;

            // Title
            content.setFont(font, 20);
            content.beginText();
            content.newLineAtOffset(50, yPosition);
            content.showText("BÁO CÁO GIAO THÔNG");
            content.endText();
            yPosition -= 40;

            // Report Info
            content.setFont(font, 12);
            content.beginText();
            content.newLineAtOffset(50, yPosition);
            content.showText("Tên báo cáo: " + job.getName());
            content.endText();
            yPosition -= 20;

            content.beginText();
            content.newLineAtOffset(50, yPosition);
            content.showText("Thời gian: " + DATE_FORMATTER.format(job.getStartTime()) +
                    " - " + DATE_FORMATTER.format(job.getEndTime()));
            content.endText();
            yPosition -= 20;

            content.beginText();
            content.newLineAtOffset(50, yPosition);
            content.showText("Độ phân giải: " + job.getIntervalMinutes() + " phút");
            content.endText();
            yPosition -= 20;

            content.beginText();
            content.newLineAtOffset(50, yPosition);
            content.showText("Ngày tạo: " + DATE_FORMATTER.format(job.getCreatedAt()));
            content.endText();
            yPosition -= 40;

            // Filters
            content.setFont(font, 14);
            content.beginText();
            content.newLineAtOffset(50, yPosition);
            content.showText("BỘ LỌC:");
            content.endText();
            yPosition -= 25;

            content.setFont(font, 12);
            if (job.getDistricts() != null && !job.getDistricts().isEmpty()) {
                content.beginText();
                content.newLineAtOffset(50, yPosition);
                content.showText("Quận: " + String.join(", ", job.getDistricts()));
                content.endText();
                yPosition -= 20;
            }

            if (job.getCameras() != null && !job.getCameras().isEmpty()) {
                content.beginText();
                content.newLineAtOffset(50, yPosition);
                content.showText("Camera: " + String.join(", ", job.getCameras()));
                content.endText();
            }
        }
    }

    private void addSummaryPage(PDDocument document, ReportJob job, ReportSummaryDTO summary, PDFont font) throws IOException {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);

        try (PDPageContentStream content = new PDPageContentStream(document, page)) {
            float yPosition = 750;

            // District Title
            content.setFont(font, 16);
            content.beginText();
            content.newLineAtOffset(50, yPosition);
            content.showText("QUẬN: " + summary.getDistrict());
            content.endText();
            yPosition -= 40;

            // Total Vehicles
            content.setFont(font, 14);
            content.beginText();
            content.newLineAtOffset(50, yPosition);
            content.showText("Tổng số phương tiện: " + summary.getTotalVehicles());
            content.endText();
            yPosition -= 30;

            // Peak Hour
            content.setFont(font, 12);
            content.beginText();
            content.newLineAtOffset(50, yPosition);
            content.showText("Giờ cao điểm: " + summary.getPeakHour());
            content.endText();
            yPosition -= 30;

            // Top Cameras
            content.setFont(font, 12);
            content.beginText();
            content.newLineAtOffset(50, yPosition);
            content.showText("Top Camera có lưu lượng cao:");
            content.endText();
            yPosition -= 20;

            content.setFont(font, 11);
            for (int i = 0; i < summary.getTopCameras().size(); i++) {
                content.beginText();
                content.newLineAtOffset(70, yPosition);
                content.showText((i + 1) + ". " + summary.getTopCameras().get(i));
                content.endText();
                yPosition -= 18;
            }
        }
    }
}

