package com.traffic.imageretrieval.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ImageResponse {
    private String fileName;
    private String url;
    private long size;
    private String lastModified;
}