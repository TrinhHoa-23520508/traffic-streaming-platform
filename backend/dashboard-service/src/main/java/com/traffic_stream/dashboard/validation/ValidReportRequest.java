package com.traffic_stream.dashboard.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Custom validation annotation để kiểm tra logic nghiệp vụ của CreateReportRequest
 */
@Documented
@Constraint(validatedBy = ValidReportRequestValidator.class)
@Target({ ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidReportRequest {
    String message() default "Yêu cầu báo cáo không hợp lệ";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

