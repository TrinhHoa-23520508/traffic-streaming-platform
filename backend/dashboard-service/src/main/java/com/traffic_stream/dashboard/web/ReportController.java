package com.traffic_stream.dashboard.web;

import com.traffic_stream.dashboard.dto.CreateReportRequest;
import com.traffic_stream.dashboard.dto.CreateReportResponse;
import com.traffic_stream.dashboard.service.ReportJobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(originPatterns = "*")
@Tag(name = "Report Management", description = "API quản lý báo cáo giao thông tự động")
public class ReportController {

    private final ReportJobService reportJobService;

    public ReportController(ReportJobService reportJobService) {
        this.reportJobService = reportJobService;
    }

    @PostMapping
    @Operation(summary = "Tạo báo cáo giao thông tự động",
               description = "Tạo yêu cầu báo cáo giao thông với các tham số tùy chỉnh. " +
                             "Báo cáo sẽ được tạo thành file PDF và lưu vào MinIO.")
    public ResponseEntity<CreateReportResponse> createReport(
            @Valid @RequestBody
            @Parameter(description = "Thông tin yêu cầu tạo báo cáo", required = true)
            CreateReportRequest request) {

        CreateReportResponse response = this.reportJobService.createReportJob(request);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

}

