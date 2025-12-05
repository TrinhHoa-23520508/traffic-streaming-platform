package com.traffic_stream.dashboard.dto;

import com.traffic_stream.dashboard.validation.ValidReportRequest;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@ValidReportRequest
@Schema(description = "Request để tạo báo cáo giao thông tự động")
@Data
public class CreateReportRequest {

    @NotBlank(message = "Tên báo cáo không được để trống")
    @Size(min = 3, max = 255, message = "Tên báo cáo phải từ 3-255 ký tự")
    @Schema(description = "Tên báo cáo", example = "Báo cáo giao thông tuần 1", required = true)
    public String name;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    @Schema(description = "Thời gian bắt đầu tổng hợp (ISO 8601)", example = "2025-01-01T00:00:00Z", required = true, type = "string", format = "date-time")
    public Instant startTime;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    @Schema(description = "Thời gian kết thúc tổng hợp (ISO 8601)", example = "2025-01-07T23:59:59Z", required = true, type = "string", format = "date-time")
    public Instant endTime;

    @NotNull(message = "Khoảng thời gian tổng hợp không được để trống")
    @Min(value = 1, message = "Khoảng thời gian phải >= 1 phút")
    @Max(value = 1440, message = "Khoảng thời gian không được vượt quá 1440 phút (1 ngày)")
    @Schema(description = "Khoảng thời gian tổng hợp (phút). VD: 5, 10, 15, 30, 60", example = "5", required = true, minimum = "1", maximum = "1440")
    public Integer intervalMinutes;

    @Schema(description = "Danh sách mã quận/huyện cần tổng hợp", example = "[\"district-1\", \"district-2\"]")
    public List<@NotBlank(message = "Mã quận không được để trống") String> districts;

    @Schema(description = "Danh sách mã camera cần tổng hợp", example = "[\"cam-01\", \"cam-02\"]")
    public List<@NotBlank(message = "Mã camera không được để trống") String> cameras;

    @Schema(description = "Thời gian thực thi báo cáo (ISO 8601). Nếu null thì thực thi ngay lập tức", example = "2025-01-08T01:00:00Z", type = "string", format = "date-time")
    public Instant executeAt = Instant.now();

}

