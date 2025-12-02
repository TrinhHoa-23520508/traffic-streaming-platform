package com.traffic.imageretrieval.controller;

import com.traffic.imageretrieval.dto.ImageResponse;
import com.traffic.imageretrieval.service.ImageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/images")
@RequiredArgsConstructor
public class ImageController {

    private final ImageService imageService;

    @GetMapping("/latest")
    public ResponseEntity<List<ImageResponse>> getLatestImages(
            @RequestParam(defaultValue = "10") int limit) {
        List<ImageResponse> images = imageService.getLatestImages(limit);
        return ResponseEntity.ok(images);
    }

    @GetMapping("/camera/{cameraId}/latest")
    public ResponseEntity<ImageResponse> getLatestImageByCamera(
            @PathVariable String cameraId) {
        ImageResponse image = imageService.getLatestImageByCamera(cameraId);
        if (image != null) {
            return ResponseEntity.ok(image);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/camera/{cameraId}")
    public ResponseEntity<List<ImageResponse>> getImagesByCamera(
            @PathVariable String cameraId,
            @RequestParam(defaultValue = "10") int limit) {
        List<ImageResponse> images = imageService.getImagesByCamera(cameraId, limit);
        return ResponseEntity.ok(images);
    }
}