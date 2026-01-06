package com.traffic_stream.dashboard.shared.utils;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MinioEndpointUtils {

    @Value("${minio.endpoint}")
    private String internalEndpoint;

    @Value("${minio.public-endpoint}")
    private String publicEndpoint;

    /**
     * Chuyển public URL (lưu trong DB) → internal URL (service dùng)
     */
    public String toInternalUrl(String publicUrl) {
        if (publicUrl == null || publicUrl.isBlank()) {
            return publicUrl;
        }
        return publicUrl.replace(publicEndpoint, internalEndpoint);
    }

    /**
     * Chuyển internal URL → public URL (trả cho frontend)
     */
    public String toPublicUrl(String internalUrl) {
        if (internalUrl == null || internalUrl.isBlank()) {
            return internalUrl;
        }
        return internalUrl.replace(internalEndpoint, publicEndpoint);
    }
}

