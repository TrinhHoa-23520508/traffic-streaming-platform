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
