package com.traffic_stream.dashboard.service;

import com.traffic_stream.dashboard.dto.CreateReportRequest;
import com.traffic_stream.dashboard.dto.CreateReportResponse;
import com.traffic_stream.dashboard.entity.ReportJob;
import com.traffic_stream.dashboard.repository.ReportJobRepository;
import com.traffic_stream.dashboard.repository.TrafficMetricRepository;
import com.traffic_stream.dashboard.shared.mapper.ReportJobMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportJobService {

    private final ReportJobRepository reportJobRepository;
    private final TrafficMetricRepository trafficMetricRepository;

    public CreateReportResponse createReportJob(CreateReportRequest request) {
        ReportJob newJob = ReportJobMapper.toEntity(request);

        // Validate execute time
        if(newJob.getExecuteAt().isBefore(newJob.getEndTime())){
            throw new IllegalArgumentException("Execute time must be after end time");
        }

        // Validate districts and cameras
        validateDistrictsAndCameras(newJob.getDistricts(), newJob.getCameras());

        return ReportJobMapper.toCreateReportResponse(
                reportJobRepository.save(newJob)
        );
    }

    private void validateDistrictsAndCameras(List<String> districts, List<String> cameras) {
        // Normalize and deduplicate inputs
        Set<String> uniqueDistricts = normalizeList(districts);
        Set<String> uniqueCameras = normalizeList(cameras);

        // Case 1: Validate districts (1 query)
        if (!uniqueDistricts.isEmpty()) {
            List<String> existingDistricts = trafficMetricRepository
                    .findExistingDistrictsIn(new ArrayList<>(uniqueDistricts));

            Set<String> existingDistrictSet = new HashSet<>(existingDistricts);
            List<String> invalidDistricts = uniqueDistricts.stream()
                    .filter(d -> !existingDistrictSet.contains(d))
                    .sorted()
                    .collect(Collectors.toList());

            if (!invalidDistricts.isEmpty()) {
                throw new IllegalArgumentException(
                    "Invalid districts: " + String.join(", ", invalidDistricts)
                );
            }
        }

        // Case 2: Validate cameras exist and belong to requested districts (1-2 queries)
        if (!uniqueCameras.isEmpty()) {
            List<String> existingCameras = trafficMetricRepository
                    .findExistingCameraIdsIn(new ArrayList<>(uniqueCameras));

            Set<String> existingCameraSet = new HashSet<>(existingCameras);
            List<String> invalidCameras = uniqueCameras.stream()
                    .filter(c -> !existingCameraSet.contains(c))
                    .sorted()
                    .collect(Collectors.toList());

            if (!invalidCameras.isEmpty()) {
                throw new IllegalArgumentException(
                    "Invalid cameras: " + String.join(", ", invalidCameras)
                );
            }

            // Case 3: If both districts and cameras provided, validate camera-district mapping (1 query)
            if (!uniqueDistricts.isEmpty()) {
                List<Object[]> mappings = trafficMetricRepository
                        .findCameraDistrictMappingsByCameraIds(new ArrayList<>(uniqueCameras));

                // Build camera -> district mapping
                Map<String, String> cameraToDistrictMap = new HashMap<>();
                for (Object[] row : mappings) {
                    String cameraId = (String) row[0];
                    String district = (String) row[1];
                    cameraToDistrictMap.put(cameraId, district);
                }

                // Find cameras not in requested districts
                List<String> mismatchedCameras = uniqueCameras.stream()
                        .filter(cam -> {
                            String camDistrict = cameraToDistrictMap.get(cam);
                            return camDistrict != null && !uniqueDistricts.contains(camDistrict);
                        })
                        .map(cam -> cam + " (district: " + cameraToDistrictMap.get(cam) + ")")
                        .sorted()
                        .collect(Collectors.toList());

                if (!mismatchedCameras.isEmpty()) {
                    throw new IllegalArgumentException(
                        "Cameras not in requested districts: " + String.join(", ", mismatchedCameras)
                    );
                }
            }
        }
    }

    /**
     * Normalize list: remove nulls, trim, remove empty, deduplicate
     */
    private Set<String> normalizeList(List<String> list) {
        if (list == null || list.isEmpty()) {
            return Collections.emptySet();
        }
        return list.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }
}
