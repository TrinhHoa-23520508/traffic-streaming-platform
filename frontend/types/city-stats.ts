export interface DetectionDetailsSummary {
    car?: number;
    motorcycle?: number;
    truck?: number;
    other?: number;
    [key: string]: number | undefined;
}

export interface CityStatsHourlyWS {
    district: string;
    hour: number;
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
