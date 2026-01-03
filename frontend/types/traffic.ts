// types/traffic.ts

export interface DetectionDetails {
    car?: number;
    motorcycle?: number;
    truck?: number;
    bus?: number;
    bicycle?: number;
    other?: number;
    [key: string]: number | undefined;
}

export interface TrafficMetricsDTO {
    id: number;
    cameraId: string;
    cameraName: string;
    district: string;
    annotatedImageUrl: string;
    coordinates: [number, number]; // [longitude, latitude]
    detectionDetails: DetectionDetails;
    totalCount: number;
    maxCount?: number;
    timestamp: string; // ISO 8601 format
}

export interface HourlySummaryItem {
    district: string;
    hour: string;
    totalCount: number;
    detectionDetailsSummary: DetectionDetails;
}

export interface FastestGrowingDistrict {
    district: string;
    growthRate: number;
    currentCount: number;
    previousCount: number;
}

export interface VehicleRatioItem {
    vehicleType: string;
    count: number;
    percentage: number;
}

export interface BusiestDistrictItem {
    name: string;
    count: number;
}

export interface BusiestCameraItem {
    name: string;
    count: number;
}

export interface DashboardUpdate {
    hourlySummary: HourlySummaryItem[];
    fastestGrowing: FastestGrowingDistrict[];
    vehicleRatio: VehicleRatioItem[];
    busiestDistricts: BusiestDistrictItem[];
    busiestCameras: BusiestCameraItem[];
    timestamp: number;
}

/**
 * Response type for /api/traffic/camera/{cameraId}/flow-rate
 */
export interface CameraFlowRate {
    cameraId: string;
    flowRatePerMinute: number;
    totalVehiclesDetected: number;
    durationMinutes: number;
    periodStart: string;
    periodEnd: string;
}

/**
 * Response type for /api/traffic/camera/{cameraId}/max-count
 */
export interface CameraMaxCount {
    cameraId: string;
    maxVehicleCount: number;
    district: string;
    timestamp: string;
}

/**
 * Traffic Level Definition
 */
export type TrafficLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Traffic Level Configuration - Ngưỡng so sánh với peak
 * So sánh currentCount với maxVehicleCount (peak):
 * - Thấp hơn nhiều (< 40% peak) → THẤP
 * - Thấp hơn vừa (40-75% peak) → TRUNG BÌNH  
 * - Thấp hơn ít hoặc cao hơn (> 75% peak) → CAO
 */
export const TRAFFIC_LEVEL_CONFIG = {
    // Ngưỡng tỉ lệ so với peak (maxVehicleCount)
    RATIO_THRESHOLDS: {
        LOW_MAX: 0.4,      // <= 40% của peak = THẤP
        MEDIUM_MAX: 0.75,  // <= 75% của peak = TRUNG BÌNH, > 75% = CAO
    },
    // Fallback nếu không có peak data - dùng số xe tuyệt đối
    FALLBACK_COUNT: {
        LOW_MAX: 15,       // <= 15 xe = THẤP
        MEDIUM_MAX: 35,    // <= 35 xe = TRUNG BÌNH, > 35 = CAO
    }
};

/**
 * Tính mức độ giao thông bằng cách so sánh currentCount với peak (maxVehicleCount)
 * 
 * @param currentCount - Số xe hiện tại (totalCount từ trafficData)
 * @param maxVehicleCount - Số xe cao nhất từng ghi nhận (peak từ API max-count)
 * @returns TrafficLevel - 'LOW' | 'MEDIUM' | 'HIGH'
 * 
 * Logic:
 * - Nếu currentCount < 40% peak → THẤP (thấp hơn nhiều)
 * - Nếu currentCount 40-75% peak → TRUNG BÌNH (thấp hơn vừa)
 * - Nếu currentCount > 75% peak → CAO (thấp hơn ít hoặc cao hơn)
 */
export function calculateTrafficLevel(
    currentCount: number,
    maxVehicleCount?: number | null
): TrafficLevel {
    const config = TRAFFIC_LEVEL_CONFIG;

    // Nếu có peak data, so sánh tỉ lệ
    if (maxVehicleCount && maxVehicleCount > 0) {
        const ratio = currentCount / maxVehicleCount;

        if (ratio <= config.RATIO_THRESHOLDS.LOW_MAX) {
            return 'LOW';      // Thấp hơn nhiều (< 40% peak)
        } else if (ratio <= config.RATIO_THRESHOLDS.MEDIUM_MAX) {
            return 'MEDIUM';   // Thấp hơn vừa (40-75% peak)
        } else {
            return 'HIGH';     // Thấp hơn ít hoặc cao hơn (> 75% peak)
        }
    }

    // Fallback: Nếu không có peak data, dùng số xe tuyệt đối
    if (currentCount <= config.FALLBACK_COUNT.LOW_MAX) {
        return 'LOW';
    } else if (currentCount <= config.FALLBACK_COUNT.MEDIUM_MAX) {
        return 'MEDIUM';
    } else {
        return 'HIGH';
    }
}

/**
 * Lấy thông tin hiển thị cho TrafficLevel (hài hòa với CameraInfoCard)
 */
export function getTrafficLevelInfo(level: TrafficLevel): {
    label: string;
    labelVi: string;
    color: string;
    bgColor: string;
    borderColor: string;
} {
    switch (level) {
        case 'HIGH':
            return {
                label: 'HIGH',
                labelVi: 'CAO',
                color: 'bg-red-500',
                bgColor: 'bg-red-50',
                borderColor: 'border-red-100',
            };
        case 'MEDIUM':
            return {
                label: 'MEDIUM',
                labelVi: 'TRUNG BÌNH',
                color: 'bg-amber-500',
                bgColor: 'bg-amber-50',
                borderColor: 'border-amber-100',
            };
        case 'LOW':
        default:
            return {
                label: 'LOW',
                labelVi: 'THẤP',
                color: 'bg-green-500',
                bgColor: 'bg-green-50',
                borderColor: 'border-green-100',
            };
    }
}
