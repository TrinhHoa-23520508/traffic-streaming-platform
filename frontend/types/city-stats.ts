export interface DetectionDetailsSummary {
    car?: number;
    motorcycle?: number;
    truck?: number;
    other?: number;
    [key: string]: number | undefined;
}

export interface CityStatsHourlyWS {
    district: string;
    hour: Date;
    totalCount: number;
    detectionDetailsSummary: DetectionDetailsSummary;
}

export interface DistrictSummary {
    totalCount: number;
    detectionDetailsSummary: DetectionDetailsSummary;
}

export interface CityStatsByDistrict {
    [district: string]: DistrictSummary;
}

export interface FastestGrowingDistrict {
    district: string;
    growthRate: number;
    currentCount: number;
    previousCount: number;
}

export interface VehicleRatio {
    vehicleType: string;
    count: number;
    percentage: number;
}

export interface BusiestEntity {
    name: string;
    count: number;
}

export interface CityStatsHourlyRaw {
    district: string;
    hour: string;
    totalCount: number;
    detectionDetailsSummary: DetectionDetailsSummary;
}

export interface CityStatsData {
    hourlySummary: CityStatsHourlyRaw[];
    fastestGrowing: FastestGrowingDistrict[];
    vehicleRatio: VehicleRatio[];
    busiestDistricts: BusiestEntity[];
    busiestCameras: BusiestEntity[];
    timestamp: number;
}
