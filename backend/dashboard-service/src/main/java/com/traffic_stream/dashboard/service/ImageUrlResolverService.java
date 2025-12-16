package com.traffic_stream.dashboard.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Service để convert URL từ frontend-accessible sang backend-accessible
 */
@Slf4j
@Service
public class ImageUrlResolverService {

    @Value("${app.image.url.frontend-host:localhost}")
    private String frontendHost;

    @Value("${app.image.url.backend-host:host.docker.internal}")
    private String backendHost;

    @Value("${app.image.url.frontend-port:3000}")
    private String frontendPort;

    @Value("${app.image.url.backend-port:3000}")
    private String backendPort;

    /**
     * Convert URL từ frontend format sang backend-accessible format
     *
     * VD: http://localhost:3000/images/cam1.jpg -> http://host.docker.internal:3000/images/cam1.jpg
     */
    public String resolveImageUrl(String frontendUrl) {
        if (frontendUrl == null || frontendUrl.trim().isEmpty()) {
            log.warn("Empty URL provided for resolution");
            return frontendUrl;
        }

        String originalUrl = frontendUrl;

        try {
            // Case 1: localhost -> host.docker.internal (Docker to host machine)
            if (frontendUrl.contains("localhost")) {
                frontendUrl = frontendUrl.replace("localhost", backendHost);
                log.debug("Resolved localhost URL: {} -> {}", originalUrl, frontendUrl);
            }

            // Case 2: 127.0.0.1 -> host.docker.internal
            if (frontendUrl.contains("127.0.0.1")) {
                frontendUrl = frontendUrl.replace("127.0.0.1", backendHost);
                log.debug("Resolved 127.0.0.1 URL: {} -> {}", originalUrl, frontendUrl);
            }

            // Case 3: 0.0.0.0 -> host.docker.internal
            if (frontendUrl.contains("0.0.0.0")) {
                frontendUrl = frontendUrl.replace("0.0.0.0", backendHost);
                log.debug("Resolved 0.0.0.0 URL: {} -> {}", originalUrl, frontendUrl);
            }

            // Case 4: Frontend specific hostname -> backend hostname
            if (!frontendHost.equals("localhost") && frontendUrl.contains(frontendHost)) {
                frontendUrl = frontendUrl.replace(frontendHost, backendHost);
                log.debug("Resolved custom host URL: {} -> {}", originalUrl, frontendUrl);
            }

            // Case 5: Port replacement if needed
            if (!frontendPort.equals(backendPort)) {
                String frontendPortPattern = ":" + frontendPort + "/";
                String backendPortPattern = ":" + backendPort + "/";
                if (frontendUrl.contains(frontendPortPattern)) {
                    frontendUrl = frontendUrl.replace(frontendPortPattern, backendPortPattern);
                    log.debug("Resolved port in URL: {} -> {}", originalUrl, frontendUrl);
                }
            }

            if (!originalUrl.equals(frontendUrl)) {
                log.info("Resolved image URL: {} -> {}", originalUrl, frontendUrl);
            }

            return frontendUrl;

        } catch (Exception e) {
            log.error("Failed to resolve URL: {}", originalUrl, e);
            return originalUrl; // Return original if resolution fails
        }
    }

    /**
     * Check if URL needs resolution
     */
    public boolean needsResolution(String url) {
        if (url == null) return false;

        return url.contains("localhost")
            || url.contains("127.0.0.1")
            || url.contains("0.0.0.0")
            || (frontendHost != null && url.contains(frontendHost));
    }

    /**
     * Resolve multiple URLs
     */
    public String[] resolveImageUrls(String... urls) {
        String[] resolved = new String[urls.length];
        for (int i = 0; i < urls.length; i++) {
            resolved[i] = resolveImageUrl(urls[i]);
        }
        return resolved;
    }
}

