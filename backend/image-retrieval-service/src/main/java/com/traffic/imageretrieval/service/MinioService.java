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

@Service
@RequiredArgsConstructor
@Slf4j
public class MinioService {

    private final MinioClient minioClient;

    @Value("${minio.bucket-name}")
    private String bucketName;

    public List<Item> getLatestObjects(int limit) {
        List<Item> items = new ArrayList<>();
        try {
            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .build());

            for (Result<Item> result : results) {
                items.add(result.get());
            }

            items.sort(Comparator.comparing(Item::lastModified).reversed());

            return items.stream().limit(limit).toList();

        } catch (Exception e) {
            log.error("Error fetching objects from MinIO: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to fetch images from MinIO", e);
        }
    }
}