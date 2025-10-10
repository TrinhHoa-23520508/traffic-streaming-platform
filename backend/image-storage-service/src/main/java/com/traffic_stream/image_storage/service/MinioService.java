package com.traffic_stream.image_storage.service;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

@Service
public class MinioService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MinioService.class);

    private final MinioClient minioClient;

    @Value("${minio.bucket.name}")
    private String bucketName;

    public MinioService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    /**
     * Stream dữ liệu trực tiếp vào MinIO
     */
    public void streamUploadToFolder(String folderName, String fileName, InputStream inputStream) {
        try {
            // Tạo folder path với dấu "/" ở cuối để MinIO hiểu là thư mục
            String objectName = sanitizeFolderName(folderName) + "/" + fileName;

            PutObjectArgs args = PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .stream(inputStream, -1, 10485760) // Kích thước chunk 10MB, không cần biết kích thước tổng (-1)
                    .contentType("image/jpeg")
                    .build();

            minioClient.putObject(args);
            LOGGER.info("Đã stream tải ảnh {} vào thư mục {} trong bucket {}", fileName, folderName, bucketName);
        } catch (Exception e) {
            LOGGER.error("Lỗi khi stream tải ảnh {} vào thư mục {}: {}",
                    fileName, folderName, e.getMessage(), e);
        }
    }

    /**
     * Upload ảnh vào MinIO với đường dẫn đầy đủ
     */
    public void uploadImage(String objectName, InputStream inputStream, String contentType) {
        try {
            PutObjectArgs args = PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .stream(inputStream, inputStream.available(), -1)
                    .contentType(contentType)
                    .build();

            minioClient.putObject(args);
            LOGGER.info("Đã tải lên ảnh {} vào bucket {}", objectName, bucketName);
        } catch (Exception e) {
            LOGGER.error("Lỗi khi tải ảnh {} lên MinIO: {}", objectName, e.getMessage(), e);
        }
    }

    /**
     * Upload ảnh vào thư mục theo tên camera
     */
    public void uploadImageToFolder(String folderName, String fileName, byte[] data) {
        try {
            String objectName = sanitizeFolderName(folderName) + "/" + fileName;
            InputStream inputStream = new ByteArrayInputStream(data);
            uploadImage(objectName, inputStream, "image/jpeg");
        } catch (Exception e) {
            LOGGER.error("Lỗi khi tải ảnh {} lên thư mục {}: {}",
                    fileName, folderName, e.getMessage(), e);
        }
    }

    /**
     * Xử lý tên thư mục để không có ký tự đặc biệt
     */
    private String sanitizeFolderName(String folderName) {
        return folderName.replaceAll("[^a-zA-Z0-9_\\-\\. ]", "_")
                .trim()
                .replace(" ", "_");
    }
}