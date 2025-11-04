// types/traffic.ts

export interface DetectionDetails {
    car?: number;
    motorcycle?: number;
    truck?: number;
    bus?: number;
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
