package com.traffic.imageretrieval.service;

import com.traffic.imageretrieval.dto.ImageResponse;
import io.minio.messages.Item;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ImageService {

    private final MinioService minioService;

    @Value("${minio.endpoint}")
    private String minioEndpoint;

    @Value("${minio.bucket-name}")
    private String bucketName;

    @Value("${minio.public-endpoint:http://localhost:9000}")
    private String minioPublicEndpoint;

    public List<ImageResponse> getLatestImages(int limit) {
        log.info("Fetching {} latest images from MinIO bucket: {}", limit, bucketName);

        List<Item> items = minioService.getLatestObjects(limit);

        return items.stream()
                .map(this::convertToImageResponse)
                .collect(Collectors.toList());
    }

    public List<ImageResponse> getImagesByCamera(String cameraId, int limit) {
        log.info("Fetching {} latest images for camera: {}", limit, cameraId);

        List<Item> items = minioService.getObjectsByCamera(cameraId, limit);

        return items.stream()
                .map(this::convertToImageResponse)
                .collect(Collectors.toList());
    }

    public ImageResponse getLatestImageByCamera(String cameraId) {
        log.info("Fetching latest image for camera: {}", cameraId);

        Item item = minioService.getLatestObjectByCamera(cameraId);

        if (item == null) {
            log.warn("No image found for camera: {}", cameraId);
            return null;
        }

        return convertToImageResponse(item);
    }

    private ImageResponse convertToImageResponse(Item item) {
        // Sử dụng public endpoint (localhost) thay vì internal endpoint (minio)
        String url = String.format("%s/%s/%s", minioPublicEndpoint, bucketName, item.objectName());
        String lastModified = item.lastModified()
                .format(DateTimeFormatter.ISO_DATE_TIME);

        return new ImageResponse(
                item.objectName(),
                url,
                item.size(),
                lastModified);
    }
}