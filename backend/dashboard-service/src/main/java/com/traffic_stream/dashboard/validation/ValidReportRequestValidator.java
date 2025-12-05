package com.traffic_stream.dashboard.validation;

import com.traffic_stream.dashboard.dto.CreateReportRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.time.Instant;
import java.util.List;

/**
 * Validator cho CreateReportRequest - kiểm tra các quy tắc nghiệp vụ phức tạp
 */
public class ValidReportRequestValidator implements ConstraintValidator<ValidReportRequest, CreateReportRequest> {

    @Override
    public boolean isValid(CreateReportRequest request, ConstraintValidatorContext context) {
        if (request == null) {
            return true; // null sẽ được validate bởi @NotNull
        }

        boolean isValid = true;
        context.disableDefaultConstraintViolation();

        // Kiểm tra: startTime phải < endTime
        if (request.startTime != null && request.endTime != null) {
            if (!request.startTime.isBefore(request.endTime)) {
                context.buildConstraintViolationWithTemplate("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc")
                        .addPropertyNode("startTime")
                        .addConstraintViolation();
                isValid = false;
            }

            // Kiểm tra: khoảng thời gian không quá 90 ngày
            long daysBetween = java.time.Duration.between(request.startTime, request.endTime).toDays();
            if (daysBetween > 90) {
                context.buildConstraintViolationWithTemplate("Khoảng thời gian báo cáo không được vượt quá 90 ngày")
                        .addPropertyNode("endTime")
                        .addConstraintViolation();
                isValid = false;
            }
        }

        // Kiểm tra: intervalMinutes nên là bội số của 5 hoặc 1
        if (request.intervalMinutes != null && request.intervalMinutes > 0) {
            // Chấp nhận các giá trị phổ biến: 1, 5, 10, 15, 30, 60, 120, 240, 360, 720, 1440
            List<Integer> validIntervals = List.of(1, 5, 10, 15, 30, 60, 120, 240, 360, 720, 1440);
            if (!validIntervals.contains(request.intervalMinutes)) {
                context.buildConstraintViolationWithTemplate(
                        "Khoảng thời gian tổng hợp phải là một trong các giá trị: 1, 5, 10, 15, 30, 60, 120, 240, 360, 720, 1440 phút")
                        .addPropertyNode("intervalMinutes")
                        .addConstraintViolation();
                isValid = false;
            }
        }

        // Kiểm tra: phải có ít nhất 1 trong districts hoặc cameras
        boolean hasDistricts = request.districts != null && !request.districts.isEmpty();
        boolean hasCameras = request.cameras != null && !request.cameras.isEmpty();

        if (!hasDistricts && !hasCameras) {
            context.buildConstraintViolationWithTemplate(
                    "Phải chọn ít nhất một quận/huyện hoặc một camera để tạo báo cáo")
                    .addPropertyNode("districts")
                    .addConstraintViolation();
            isValid = false;
        }

        // Kiểm tra: nếu có executeAt, phải là thời gian trong tương lai hoặc hiện tại
        if (request.executeAt != null) {
            Instant now = Instant.now();
            if (request.executeAt.isBefore(now.minusSeconds(60))) {
                context.buildConstraintViolationWithTemplate(
                        "Thời gian thực thi phải là thời điểm hiện tại hoặc tương lai")
                        .addPropertyNode("executeAt")
                        .addConstraintViolation();
                isValid = false;
            }
        }

        return isValid;
    }
}

