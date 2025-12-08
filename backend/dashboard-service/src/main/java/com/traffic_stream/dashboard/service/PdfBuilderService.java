package com.traffic_stream.dashboard.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.jfree.chart.ChartFactory;
import org.jfree.chart.JFreeChart;
import org.jfree.chart.plot.PlotOrientation;
import org.jfree.data.category.DefaultCategoryDataset;
import org.jfree.data.general.DefaultPieDataset;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Service tạo PDF với các tiện ích vẽ
 */
@Slf4j
@Service
public class PdfBuilderService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    private static final DateTimeFormatter TIME_FORMATTER =
            DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    // Colors
    private static final Color HEADER_COLOR = new Color(41, 128, 185);
    private static final Color SECTION_COLOR = new Color(52, 152, 219);
    private static final Color BACKGROUND_COLOR = new Color(236, 240, 241);
    private static final Color TEXT_COLOR = Color.BLACK;
    private static final Color GRID_COLOR = new Color(189, 195, 199);

    // Fonts
    private PDFont fontBold;
    private PDFont fontRegular;

    /**
     * Initialize fonts for a specific document (must be called before using other methods)
     */
    public void initializeFonts(PDDocument document) throws IOException {
        // Try multiple font sources in order of preference

        // 1. Try Windows fonts first (most reliable on Windows)
        if (loadWindowsFonts(document)) {
            log.info("Loaded Windows system fonts (supports Vietnamese)");
            return;
        }

        // 2. Try Liberation Sans from PDFBox
        if (loadLiberationFonts(document)) {
            log.info("Loaded Liberation Sans fonts (supports Vietnamese)");
            return;
        }

        // 3. Try Linux fonts
        if (loadLinuxFonts(document)) {
            log.info("Loaded Linux system fonts (supports Vietnamese)");
            return;
        }

        // 4. Last resort - throw exception instead of using Helvetica
        throw new IOException("Cannot load any Unicode font that supports Vietnamese characters. Please install Arial, Liberation Sans, or DejaVu Sans fonts.");
    }

    private boolean loadWindowsFonts(PDDocument document) {
        try {
            File arialRegular = new File("C:/Windows/Fonts/arial.ttf");
            File arialBold = new File("C:/Windows/Fonts/arialbd.ttf");

            if (arialRegular.exists() && arialBold.exists()) {
                this.fontRegular = PDType0Font.load(document, arialRegular);
                this.fontBold = PDType0Font.load(document, arialBold);
                return true;
            }
        } catch (Exception e) {
            log.debug("Windows fonts not available: {}", e.getMessage());
        }
        return false;
    }

    private boolean loadLiberationFonts(PDDocument document) {
        try {
            // Try different possible paths for Liberation Sans
            String[] paths = {
                "/org/apache/pdfbox/resources/ttf/LiberationSans-Regular.ttf",
                "/fonts/LiberationSans-Regular.ttf",
                "LiberationSans-Regular.ttf"
            };

            for (String regularPath : paths) {
                String boldPath = regularPath.replace("Regular", "Bold");

                InputStream regularStream = getClass().getResourceAsStream(regularPath);
                InputStream boldStream = getClass().getResourceAsStream(boldPath);

                if (regularStream != null && boldStream != null) {
                    this.fontRegular = PDType0Font.load(document, regularStream);
                    this.fontBold = PDType0Font.load(document, boldStream);
                    regularStream.close();
                    boldStream.close();
                    return true;
                }
            }
        } catch (Exception e) {
            log.debug("Liberation Sans fonts not available: {}", e.getMessage());
        }
        return false;
    }

    private boolean loadLinuxFonts(PDDocument document) {
        try {
            // Try Liberation Sans (Debian/Ubuntu package: fonts-liberation)
            String[][] linuxFontPaths = {
                // Liberation Sans (preferred for Vietnamese)
                {"/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                 "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"},
                {"/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
                 "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf"},
                // DejaVu Sans (fallback)
                {"/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"},
                // Noto Sans (another option)
                {"/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
                 "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"}
            };

            for (String[] fontPair : linuxFontPaths) {
                File regularFile = new File(fontPair[0]);
                File boldFile = new File(fontPair[1]);

                if (regularFile.exists() && boldFile.exists()) {
                    this.fontRegular = PDType0Font.load(document, regularFile);
                    this.fontBold = PDType0Font.load(document, boldFile);
                    log.info("Loaded Linux fonts from: {}", fontPair[0]);
                    return true;
                }
            }
        } catch (Exception e) {
            log.debug("Linux fonts not available: {}", e.getMessage());
        }
        return false;
    }

    /**
     * Tạo trang mới và trả về ContentStream
     */
    public PDPage createNewPage(PDDocument document) {
        PDPage page = new PDPage(PDRectangle.A4);
        document.addPage(page);
        return page;
    }

    /**
     * Vẽ header trang
     */
    public void drawHeader(PDPageContentStream content, String title, int pageNumber) throws IOException {

        // Draw header background
        content.setNonStrokingColor(HEADER_COLOR);
        content.addRect(50, 750, 495, 40);
        content.fill();

        // Draw title
        content.setNonStrokingColor(Color.WHITE);
        content.beginText();
        content.setFont(fontBold, 18);
        content.newLineAtOffset(60, 765);
        content.showText(title);
        content.endText();

        // Draw page number
        content.beginText();
        content.setFont(fontRegular, 10);
        content.newLineAtOffset(520, 765);
        content.showText("Trang " + pageNumber);
        content.endText();

        content.setNonStrokingColor(TEXT_COLOR);
    }

    /**
     * Vẽ section header
     */
    public float drawSectionHeader(PDPageContentStream content, String sectionTitle, float yPosition) throws IOException {
        content.setNonStrokingColor(SECTION_COLOR);
        content.addRect(50, yPosition - 5, 495, 25);
        content.fill();

        content.setNonStrokingColor(Color.WHITE);
        content.beginText();
        content.setFont(fontBold, 14);
        content.newLineAtOffset(60, yPosition);
        content.showText(sectionTitle);
        content.endText();

        content.setNonStrokingColor(TEXT_COLOR);
        return yPosition - 35;
    }

    /**
     * Vẽ text thường
     */
    public float drawText(PDPageContentStream content, String text, float x, float yPosition, int fontSize) throws IOException {
        content.beginText();
        content.setFont(fontRegular, fontSize);
        content.newLineAtOffset(x, yPosition);
        content.showText(text);
        content.endText();
        return yPosition - fontSize - 5;
    }

    /**
     * Vẽ text in đậm
     */
    public float drawBoldText(PDPageContentStream content, String text, float x, float yPosition, int fontSize) throws IOException {
        content.beginText();
        content.setFont(fontBold, fontSize);
        content.newLineAtOffset(x, yPosition);
        content.showText(text);
        content.endText();
        return yPosition - fontSize - 5;
    }

    /**
     * Vẽ bảng
     */
    public float drawTable(PDPageContentStream content, float yPosition,
                          String[] headers, List<String[]> rows,
                          float[] columnWidths) throws IOException {

        float tableWidth = 0;
        for (float width : columnWidths) {
            tableWidth += width;
        }

        float startX = 60;
        float currentY = yPosition;

        // Draw header
        content.setNonStrokingColor(BACKGROUND_COLOR);
        content.addRect(startX, currentY - 20, tableWidth, 20);
        content.fill();
        content.setNonStrokingColor(TEXT_COLOR);

        float cellX = startX;
        for (int i = 0; i < headers.length; i++) {
            content.beginText();
            content.setFont(fontBold, 10);
            content.newLineAtOffset(cellX + 5, currentY - 15);
            content.showText(headers[i]);
            content.endText();
            cellX += columnWidths[i];
        }

        currentY -= 20;

        // Draw rows
        for (String[] row : rows) {
            cellX = startX;
            currentY -= 18;

            for (int i = 0; i < row.length; i++) {
                content.beginText();
                content.setFont(fontRegular, 9);
                content.newLineAtOffset(cellX + 5, currentY);
                content.showText(row[i] != null ? row[i] : "");
                content.endText();
                cellX += columnWidths[i];
            }

            // Draw row separator
            content.setStrokingColor(GRID_COLOR);
            content.setLineWidth(0.5f);
            content.moveTo(startX, currentY - 3);
            content.lineTo(startX + tableWidth, currentY - 3);
            content.stroke();
        }

        // Draw table border
        content.setStrokingColor(GRID_COLOR);
        content.setLineWidth(1);
        content.addRect(startX, currentY - 3, tableWidth, (rows.size() + 1) * 18 + 5);
        content.stroke();

        return currentY - 10;
    }

    /**
     * Vẽ key-value pair
     */
    public float drawKeyValue(PDPageContentStream content, String key, String value, float x, float yPosition) throws IOException {
        content.beginText();
        content.setFont(fontBold, 10);
        content.newLineAtOffset(x, yPosition);
        content.showText(key + ": ");
        content.endText();

        float keyWidth = fontBold.getStringWidth(key + ": ") / 1000 * 10;

        content.beginText();
        content.setFont(fontRegular, 10);
        content.newLineAtOffset(x + keyWidth, yPosition);
        content.showText(value);
        content.endText();

        return yPosition - 15;
    }

    /**
     * Vẽ bullet list
     */
    public float drawBulletList(PDPageContentStream content, List<String> items, float x, float yPosition) throws IOException {
        for (String item : items) {
            // Draw bullet
            content.setNonStrokingColor(SECTION_COLOR);
            content.addRect(x, yPosition - 2, 3, 3);
            content.fill();
            content.setNonStrokingColor(TEXT_COLOR);

            // Draw text (with word wrap)
            yPosition = drawWrappedText(content, item, x + 10, yPosition, 475, 10);
            yPosition -= 5;
        }
        return yPosition;
    }

    /**
     * Vẽ text với word wrap
     */
    public float drawWrappedText(PDPageContentStream content, String text, float x, float yPosition,
                                 float maxWidth, int fontSize) throws IOException {
        String[] words = text.split(" ");
        StringBuilder line = new StringBuilder();

        for (String word : words) {
            String testLine = line.length() == 0 ? word : line + " " + word;
            float textWidth = fontRegular.getStringWidth(testLine) / 1000 * fontSize;

            if (textWidth > maxWidth && line.length() > 0) {
                content.beginText();
                content.setFont(fontRegular, fontSize);
                content.newLineAtOffset(x, yPosition);
                content.showText(line.toString());
                content.endText();

                yPosition -= fontSize + 3;
                line = new StringBuilder(word);
            } else {
                line = new StringBuilder(testLine);
            }
        }

        if (line.length() > 0) {
            content.beginText();
            content.setFont(fontRegular, fontSize);
            content.newLineAtOffset(x, yPosition);
            content.showText(line.toString());
            content.endText();
            yPosition -= fontSize + 3;
        }

        return yPosition;
    }

    /**
     * Tạo biểu đồ cột và thêm vào PDF
     */
    public PDImageXObject createBarChart(PDDocument document, String title, Map<String, Long> data) throws IOException {
        DefaultCategoryDataset dataset = new DefaultCategoryDataset();
        data.forEach((key, value) -> dataset.addValue(value, "Số lượng", key));

        JFreeChart chart = ChartFactory.createBarChart(
                title,
                "Danh mục",
                "Số phương tiện",
                dataset,
                PlotOrientation.VERTICAL,
                false,
                true,
                false
        );

        chart.setBackgroundPaint(Color.WHITE);
        chart.getPlot().setBackgroundPaint(new Color(245, 245, 245));

        return chartToImage(document, chart, 500, 300);
    }

    /**
     * Tạo biểu đồ tròn và thêm vào PDF
     */
    @SuppressWarnings({"rawtypes", "unchecked"})
    public PDImageXObject createPieChart(PDDocument document, String title, Map<String, Double> data) throws IOException {
        DefaultPieDataset dataset = new DefaultPieDataset();
        data.forEach(dataset::setValue);

        JFreeChart chart = ChartFactory.createPieChart(
                title,
                dataset,
                true,
                true,
                false
        );

        chart.setBackgroundPaint(Color.WHITE);

        return chartToImage(document, chart, 400, 300);
    }

    /**
     * Tạo biểu đồ đường và thêm vào PDF
     */
    public PDImageXObject createLineChart(PDDocument document, String title, Map<String, Long> data) throws IOException {
        DefaultCategoryDataset dataset = new DefaultCategoryDataset();
        data.forEach((key, value) -> dataset.addValue(value, "Lưu lượng", key));

        JFreeChart chart = ChartFactory.createLineChart(
                title,
                "Thời gian",
                "Số phương tiện",
                dataset,
                PlotOrientation.VERTICAL,
                false,
                true,
                false
        );

        chart.setBackgroundPaint(Color.WHITE);
        chart.getPlot().setBackgroundPaint(new Color(245, 245, 245));

        return chartToImage(document, chart, 500, 250);
    }

    /**
     * Chuyển JFreeChart thành PDImageXObject
     */
    private PDImageXObject chartToImage(PDDocument document, JFreeChart chart, int width, int height) throws IOException {
        BufferedImage bufferedImage = chart.createBufferedImage(width, height);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(bufferedImage, "png", baos);
        return PDImageXObject.createFromByteArray(document, baos.toByteArray(), "chart");
    }

    /**
     * Vẽ ảnh từ URL
     */
    public void drawImageFromUrl(PDPageContentStream content, PDDocument document,
                                 String imageUrl, float x, float y, float width, float height) {
        try {
            URL url = new URL(imageUrl);
            BufferedImage bufferedImage = ImageIO.read(url);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(bufferedImage, "jpg", baos);

            PDImageXObject image = PDImageXObject.createFromByteArray(document, baos.toByteArray(), "image");
            content.drawImage(image, x, y, width, height);
        } catch (Exception e) {
            log.warn("Failed to load image from URL: {}", imageUrl, e);
            // Draw placeholder
            try {
                content.setStrokingColor(GRID_COLOR);
                content.addRect(x, y, width, height);
                content.stroke();

                content.beginText();
                content.setFont(fontRegular, 8);
                content.newLineAtOffset(x + 5, y + height / 2);
                content.showText("Image not available");
                content.endText();
            } catch (IOException ex) {
                log.error("Failed to draw placeholder", ex);
            }
        }
    }

    /**
     * Format Instant thành string
     */
    public String formatDateTime(Instant instant) {
        return DATE_TIME_FORMATTER.format(instant);
    }

    /**
     * Format Instant thành time only
     */
    public String formatTime(Instant instant) {
        return TIME_FORMATTER.format(instant);
    }

    /**
     * Format số với dấu phẩy
     */
    public String formatNumber(long number) {
        return String.format("%,d", number);
    }

    /**
     * Format số thực
     */
    public String formatDouble(double number, int decimals) {
        String format = "%." + decimals + "f";
        return String.format(format, number);
    }
}

