package com.traffic_stream.dashboard.service.storage;

import com.traffic_stream.dashboard.entity.ReportJob;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("unused")
public class MinioStorageService {

    private final MinioClient minioClient;


    public String uploadReportFile(File file, ReportJob job, String bucket) throws Exception {
        log.info("Starting MinIO upload for job {}, bucket: {}", job.getId(), bucket);

        // Ensure bucket exists
        ensureBucketExists(bucket);

        String year = DateTimeFormatter.ofPattern("yyyy").withZone(ZoneId.systemDefault()).format(Instant.now());
        String month = DateTimeFormatter.ofPattern("MM").withZone(ZoneId.systemDefault()).format(Instant.now());

        String objectName = String.format("reports/%s/%s/traffic_report_%s.pdf", year, month, job.getId());
        log.info("Object name: {}, file size: {} bytes", objectName, file.length());

        try (FileInputStream fis = new FileInputStream(file)) {
            log.info("Uploading to MinIO bucket: {}, object: {}", bucket, objectName);
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectName)
                            .stream(fis, file.length(), -1)
                            .contentType("application/pdf")
                            .build()
            );
            log.info("Successfully uploaded to MinIO: {}", objectName);
        } catch (Exception e) {
            log.error("Failed to upload to MinIO: {}", e.getMessage(), e);
            throw e;
        }

        // return object path or presigned URL if you prefer
        return objectName; // store object path in DB; download API will stream
    }

    /**
     * Kiểm tra và tạo bucket nếu chưa tồn tại
     */
    private void ensureBucketExists(String bucketName) throws Exception {
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder()
                            .bucket(bucketName)
                            .build()
            );

            if (!exists) {
                log.warn("Bucket {} does not exist, creating it now...", bucketName);
                minioClient.makeBucket(
                        MakeBucketArgs.builder()
                                .bucket(bucketName)
                                .build()
                );
                log.info("Successfully created bucket: {}", bucketName);
            } else {
                log.debug("Bucket {} already exists", bucketName);
            }
        } catch (Exception e) {
            log.error("Failed to ensure bucket exists: {}", bucketName, e);
            throw e;
        }
    }

    public InputStream getObjectStream(String objectName, String bucket) throws Exception {
        return minioClient.getObject(io.minio.GetObjectArgs.builder()
                .bucket(bucket)
                .object(objectName)
                .build());
    }
}

