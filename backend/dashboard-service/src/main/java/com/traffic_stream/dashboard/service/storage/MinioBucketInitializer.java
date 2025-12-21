package com.traffic_stream.dashboard.service.storage;

import com.traffic_stream.dashboard.config.MinioBucketProperties;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.SetBucketPolicyArgs;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@Slf4j
@RequiredArgsConstructor
@SuppressWarnings("unused")
public class MinioBucketInitializer {

    private final MinioClient minioClient;
    private final MinioBucketProperties bucketProperties;

    /**
     * Khởi tạo tất cả các buckets cần thiết khi ứng dụng start
     */
    @PostConstruct
    public void initializeBuckets() {
        log.info("Initializing MinIO buckets...");

        // Tạo bucket documents để lưu file PDF reports
        createBucketIfNotExists(bucketProperties.getDocuments());

        log.info("MinIO buckets initialization completed");
    }

    /**
     * Tạo bucket nếu chưa tồn tại
     *
     * @param bucketName tên bucket cần tạo
     */
    public void createBucketIfNotExists(String bucketName) {
        try {
            boolean exists = minioClient.bucketExists(
                    BucketExistsArgs.builder()
                            .bucket(bucketName)
                            .build()
            );

            if (!exists) {
                // Tạo bucket
                minioClient.makeBucket(
                        MakeBucketArgs.builder()
                                .bucket(bucketName)
                                .build()
                );

                log.info("✓ Created MinIO bucket: {}", bucketName);

                // Set policy cho bucket nếu cần (optional)
                // setPolicyForBucket(bucketName);
            } else {
                log.info("✓ MinIO bucket already exists: {}", bucketName);
            }
        } catch (Exception e) {
            log.error("✗ Failed to create MinIO bucket: {}", bucketName, e);
            // Không throw exception để không ngăn ứng dụng khởi động
            // Admin có thể tạo bucket thủ công sau
        }
    }

    /**
     * Set policy cho bucket để cho phép download public (nếu cần)
     * Mặc định bucket sẽ là private, chỉ download qua presigned URL
     *
     * @param bucketName tên bucket
     */
    private void setPolicyForBucket(String bucketName) {
        try {
            // Policy cho phép read-only public access
            String policy = """
                    {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Effect": "Allow",
                                "Principal": {"AWS": "*"},
                                "Action": ["s3:GetObject"],
                                "Resource": ["arn:aws:s3:::%s/*"]
                            }
                        ]
                    }
                    """.formatted(bucketName);

            minioClient.setBucketPolicy(
                    SetBucketPolicyArgs.builder()
                            .bucket(bucketName)
                            .config(policy)
                            .build()
            );

            log.info("Set public read policy for bucket: {}", bucketName);
        } catch (Exception e) {
            log.warn("Failed to set policy for bucket: {}", bucketName, e);
        }
    }

    /**
     * Kiểm tra bucket có tồn tại hay không
     *
     * @param bucketName tên bucket
     * @return true nếu bucket tồn tại
     */
    public boolean bucketExists(String bucketName) {
        try {
            return minioClient.bucketExists(
                    BucketExistsArgs.builder()
                            .bucket(bucketName)
                            .build()
            );
        } catch (Exception e) {
            log.error("Error checking bucket existence: {}", bucketName, e);
            return false;
        }
    }
}

