package com.traffic_stream.dashboard.shared.utils.handler;

import com.traffic_stream.dashboard.dto.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalException {

    @ExceptionHandler(value = {
            HttpMessageNotReadableException.class,
            IllegalArgumentException.class,
            IllegalStateException.class,
    })
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ApiResponse<Object>> handleBusinessExceptions(Exception ex) {

        ApiResponse<Object> res = new ApiResponse<>();
        res.setStatus(HttpStatus.BAD_REQUEST.value());
        res.setSuccess(false);
        res.setCode("BAD_REQUEST");
        res.setMessage("Exception occurred: " + ex.getMessage());
        res.setTimestamp(Instant.now());

        return ResponseEntity.badRequest().body(res);
    }


    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ApiResponse<Object>> handleValidationError(MethodArgumentNotValidException ex) {
        // Collect field-specific validation errors
        List<String> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .collect(Collectors.toList());

        ApiResponse<Object> res = new ApiResponse<>();
        res.setSuccess(false);
        res.setStatus(HttpStatus.BAD_REQUEST.value());
        res.setMessage(String.join("; ", errors));
        res.setCode("BAD_REQUEST");
        res.setTimestamp(Instant.now());

        return ResponseEntity.badRequest().body(res);
    }

    /**
     * Handle violations raised by @Validated on method parameters.
     */
    @ExceptionHandler(ConstraintViolationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<ApiResponse<Object>> handleConstraintViolation(ConstraintViolationException ex) {
        List<String> errors = ex.getConstraintViolations()
                .stream()
                .map(cv -> cv.getPropertyPath() + ": " + cv.getMessage())
                .collect(Collectors.toList());

        ApiResponse<Object> res = new ApiResponse<>();
        res.setSuccess(false);
        res.setStatus(HttpStatus.BAD_REQUEST.value());
        res.setMessage(String.join("; ", errors));
        res.setCode("VALIDATION_ERROR");
        res.setTimestamp(Instant.now());

        return ResponseEntity.badRequest().body(res);
    }

    /**
     * Handle unexpected/unhandled exceptions and return HTTP 500.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleAllExceptions(Exception ex) {

        ApiResponse<Object> res = new ApiResponse<>();
        res.setSuccess(false);
        res.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
        res.setMessage("Internal server error: " + ex.getMessage());
        res.setCode("INTERNAL_ERROR");
        res.setTimestamp(Instant.now());

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(res);
    }
}
