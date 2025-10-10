package com.traffic_stream.image_storage.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@Component
public class ImageStreamProvider {

    private static final Logger LOGGER = LoggerFactory.getLogger(ImageStreamProvider.class);
    private final RestTemplate restTemplate;

    @Value("${camera.api.base-url:https://api.notis.vn/v4/}")
    private String cameraBaseUrl;

    public ImageStreamProvider(RestTemplate restTemplate) { // Đổi tên constructor
        this.restTemplate = restTemplate;
    }

    /**
     * Mở stream từ URL trực tiếp, trả về InputStream thay vì tải toàn bộ dữ liệu
     */
    public InputStream openImageStream(String urlPath) {
        HttpURLConnection connection = null;
        try {
            // Kiểm tra nếu đường dẫn là tương đối, thì thêm base URL
            String fullUrl;
            if (urlPath.startsWith("http://") || urlPath.startsWith("https://")) {
                fullUrl = urlPath; // URL đã đầy đủ
            } else {
                fullUrl = cameraBaseUrl + urlPath; // Thêm base URL
            }

            LOGGER.info("Đang mở stream từ URL: {}", fullUrl);

            // Tạo kết nối
            URL url = new URL(fullUrl);
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(30000);

            // Kiểm tra response code
            int responseCode = connection.getResponseCode();
            if (responseCode != 200) {
                LOGGER.error("Lỗi khi tải ảnh từ {}: HTTP response code {}", fullUrl, responseCode);
                if (connection != null) {
                    connection.disconnect();
                }
                return null;
            }

            // Trả về stream trực tiếp
            LOGGER.info("Đã mở stream thành công từ URL: {}", fullUrl);
            return connection.getInputStream();
        } catch (Exception e) {
            LOGGER.error("Lỗi khi mở stream từ {}: {} (Loại lỗi: {})",
                    urlPath, e.getMessage(), e.getClass().getName(), e);
            if (connection != null) {
                connection.disconnect();
            }
            return null;
        }
    }

    // Giữ phương thức cũ để tương thích ngược
    public byte[] downloadImage(String urlPath) {
        try (InputStream is = openImageStream(urlPath)) {
            if (is == null) {
                return null;
            }
            return is.readAllBytes();
        } catch (Exception e) {
            LOGGER.error("Lỗi khi tải ảnh từ {}: {}", urlPath, e.getMessage());
            return null;
        }
    }
}