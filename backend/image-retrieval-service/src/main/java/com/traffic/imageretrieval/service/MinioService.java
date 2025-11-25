package com.traffic.imageretrieval.service;

import io.minio.ListObjectsArgs;
import io.minio.MinioClient;
import io.minio.Result;
import io.minio.messages.Item;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MinioService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    private static final String BASE_PREFIX = "analyzed-images/";

    public List<Item> getLatestObjects(int limit) {
        List<Item> items = new ArrayList<>();
        try {
            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .prefix(BASE_PREFIX)
                            .recursive(true)
                            .build());

            for (Result<Item> result : results) {
                Item item = result.get();
                // Chỉ lấy file, không lấy thư mục
                if (!item.isDir()) {
                    items.add(item);
                }
            }

            items.sort(Comparator.comparing(Item::lastModified).reversed());

            return items.stream().limit(limit).collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error fetching objects from MinIO: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch images from MinIO", e);
        }
    }

    public List<Item> getObjectsByCamera(String cameraId, int limit) {
        List<Item> items = new ArrayList<>();
        try {
            // Prefix để lọc theo camera: analyzed-images/{camera_id}/
            String cameraPrefix = BASE_PREFIX + cameraId + "/";

            log.info("Fetching images for camera {} with prefix: {}", cameraId, cameraPrefix);

            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .prefix(cameraPrefix)
                            .recursive(true)
                            .build());

            for (Result<Item> result : results) {
                Item item = result.get();
                // Chỉ lấy file, không lấy thư mục
                if (!item.isDir()) {
                    items.add(item);
                    log.debug("Found image: {}", item.objectName());
                }
            }

            // Sắp xếp theo thời gian mới nhất
            items.sort(Comparator.comparing(Item::lastModified).reversed());

            log.info("Found {} images for camera {}", items.size(), cameraId);

            // Giới hạn số lượng
            return items.stream().limit(limit).collect(Collectors.toList());

        } catch (Exception e) {
            log.error("Error fetching objects for camera {}: {}", cameraId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch images for camera " + cameraId, e);
        }
    }

    public Item getLatestObjectByCamera(String cameraId) {
        try {
            List<Item> items = getObjectsByCamera(cameraId, 1);
            if (items.isEmpty()) {
                log.warn("No images found for camera: {}", cameraId);
                return null;
            }
            log.info("Latest image for camera {}: {}", cameraId, items.get(0).objectName());
            return items.get(0);
        } catch (Exception e) {
            log.error("Error fetching latest object for camera {}: {}", cameraId, e.getMessage(), e);
            return null;
        }
    }

    public List<String> getAllCameraIds() {
        List<String> cameraIds = new ArrayList<>();
        try {
            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .prefix(BASE_PREFIX)
                            .recursive(false)
                            .build());

            for (Result<Item> result : results) {
                Item item = result.get();
                if (item.isDir()) {
                    // Lấy tên camera từ path: analyzed-images/{camera_id}/
                    String objectName = item.objectName();
                    String cameraId = objectName
                            .replace(BASE_PREFIX, "")
                            .replace("/", "");
                    if (!cameraId.isEmpty()) {
                        cameraIds.add(cameraId);
                    }
                }
            }

            log.info("Found {} cameras", cameraIds.size());
            return cameraIds;

        } catch (Exception e) {
            log.error("Error fetching camera list: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch camera list", e);
        }
    }
}