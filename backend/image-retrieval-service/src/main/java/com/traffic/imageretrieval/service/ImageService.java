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

    public List<ImageResponse> getLatestImages(int limit) {
        log.info("Fetching {} latest images from MinIO bucket: {}", limit, bucketName);

        List<Item> items = minioService.getLatestObjects(limit);

        return items.stream()
                .map(this::convertToImageResponse)
                .collect(Collectors.toList());
    }

    private ImageResponse convertToImageResponse(Item item) {
        String url = String.format("%s/%s/%s", minioEndpoint, bucketName, item.objectName());
        String lastModified = item.lastModified()
                .format(DateTimeFormatter.ISO_DATE_TIME);

        return new ImageResponse(
                item.objectName(),
                url,
                item.size(),
                lastModified);
    }
}