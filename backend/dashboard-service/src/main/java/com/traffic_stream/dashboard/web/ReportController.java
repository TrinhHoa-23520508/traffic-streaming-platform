package com.traffic_stream.dashboard.web;

import com.traffic_stream.dashboard.dto.report.CreateReportRequest;
import com.traffic_stream.dashboard.dto.report.CreateReportResponse;
import com.traffic_stream.dashboard.entity.ReportJob;
import com.traffic_stream.dashboard.service.ReportJobService;
import com.traffic_stream.dashboard.shared.constant.ReportJobStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping
    @Operation(summary = "Lấy danh sách báo cáo",
               description = "Lấy danh sách tất cả báo cáo hoặc lọc theo trạng thái")
    public ResponseEntity<List<ReportJob>> getReportList(
            @Parameter(description = "Lọc theo trạng thái báo cáo (PENDING, RUNNING, COMPLETED, FAILED)")
            @RequestParam(required = false) ReportJobStatus status
            ){
        if(status != null){
            return ResponseEntity.ok(reportJobService.getReportJobsByStatus(status));
        } else {
            return ResponseEntity.ok(reportJobService.getAllReportJobs());
        }
    }

    @GetMapping("/{reportId}")
    @Operation(summary = "Lấy thông tin báo cáo theo ID",
               description = "Lấy chi tiết thông tin một báo cáo cụ thể")
    public ResponseEntity<ReportJob> getReportById(
            @Parameter(description = "ID của báo cáo", required = true)
            @PathVariable Long reportId
    ) {
        ReportJob reportJob = reportJobService.getReportJobById(reportId);
        return ResponseEntity.ok(reportJob);
    }

    @DeleteMapping("/{reportId}")
    @Operation(summary = "Xóa báo cáo",
               description = "Xóa báo cáo theo ID")
    public ResponseEntity<Void> deleteReportById(
            @Parameter(description = "ID của báo cáo cần xóa", required = true)
            @PathVariable Long reportId
    ) {
        reportJobService.deleteReportJobById(reportId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping(value = "/download/{reportId}", produces = MediaType.APPLICATION_PDF_VALUE)
    @Operation(summary = "Tải xuống báo cáo PDF",
               description = "Tải file PDF báo cáo đã được tạo thành công")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "File PDF báo cáo",
                     content = @Content(mediaType = "application/pdf",
                                        schema = @Schema(type = "string", format = "binary"))),
        @ApiResponse(responseCode = "404", description = "Không tìm thấy báo cáo hoặc file PDF chưa được tạo"),
        @ApiResponse(responseCode = "400", description = "Báo cáo chưa hoàn thành (status != COMPLETED)"),
        @ApiResponse(responseCode = "500", description = "Lỗi khi tải file PDF từ MinIO")
    })
    public ResponseEntity<Resource> downloadReport(
            @Parameter(description = "ID của báo cáo cần tải", required = true)
            @PathVariable Long reportId) {

        Resource pdfResource = reportJobService.getReportPdf(reportId);

        String filename = "traffic-report-" + reportId + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfResource);
    }


}

