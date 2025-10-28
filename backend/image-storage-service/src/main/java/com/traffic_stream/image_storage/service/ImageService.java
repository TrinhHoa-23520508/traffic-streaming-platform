package com.traffic_stream.image_storage.service;

import com.traffic_stream.image_storage.util.ImageStreamProvider;

import org.checkerframework.checker.units.qual.A;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;

@Service
public class ImageService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ImageService.class);
    private final ImageStreamProvider imageStreamProvider;
    private final MinioService minioService;
    private final SimpleDateFormat dateFormat;

    public ImageService(ImageStreamProvider imageStreamProvider, MinioService minioService) {
        this.imageStreamProvider = imageStreamProvider;
        this.minioService = minioService;
        this.dateFormat = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss");
    }

    /**
     * Xử lý và stream ảnh trực tiếp từ URL vào MinIO
     */
    @Async
    public void streamAndStoreImage(String cameraId, String cameraName, String url, long timestamp) {
        try (InputStream imageStream = imageStreamProvider.openImageStream(url)) {
            if (imageStream != null) {
                // Luôn sử dụng cameraId để đặt tên thư mục
                String folderName = cameraId;

                // Tạo tên file với timestamp
                String fileName = dateFormat.format(new Date(timestamp)) + ".jpg";

                // Stream trực tiếp vào thư mục tương ứng
                minioService.streamUploadToFolder(folderName, fileName, imageStream);
                LOGGER.info("Đã stream ảnh {} vào thư mục {} trong MinIO (camera: {})",
                        fileName, folderName, cameraName);
            } else {
                LOGGER.warn("Không thể stream ảnh từ camera {} ({}) - không mở được stream",
                        cameraId, cameraName);
            }
        } catch (Exception e) {
            LOGGER.error("Lỗi khi stream ảnh từ camera {} ({}): {}",
                    cameraId, cameraName, e.getMessage(), e);
        }
    }

    /**
     * Phương thức cũ để tương thích ngược
     */
    public void processAndStoreImage(String cameraId, String cameraName, String url, long timestamp) {
        // Sử dụng phương thức streaming mới
        streamAndStoreImage(cameraId, cameraName, url, timestamp);
    }
}