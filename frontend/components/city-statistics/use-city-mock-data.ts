import { useState, useEffect, useMemo } from 'react';
import { CHART_COLORS } from './color';

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export interface CameraStats {
    id: string;
    name: string;
    district: string;
    count: number;
    trend: number;
}

export interface DistrictStats {
    name: string;
    count: number;
    trend: number;
}

export interface DistrictHistoryPoint {
    time: string;
    [district: string]: number | string;
}

const CAMERAS = [
    { id: 'cam1', name: 'Ngã 4 Hàng Xanh', district: 'Bình Thạnh' },
    { id: 'cam2', name: 'Cầu Sài Gòn', district: 'Bình Thạnh' },
    { id: 'cam3', name: 'Vòng xoay Dân Chủ', district: 'Quận 3' },
    { id: 'cam4', name: 'Phố đi bộ Nguyễn Huệ', district: 'Quận 1' },
    { id: 'cam5', name: 'Ngã 6 Phù Đổng', district: 'Quận 1' },
    { id: 'cam6', name: 'Xa lộ Hà Nội', district: 'Thủ Đức' },
    { id: 'cam7', name: 'Phạm Văn Đồng', district: 'Gò Vấp' },
    { id: 'cam8', name: 'Ngã 4 Bảy Hiền', district: 'Tân Bình' },
    { id: 'cam9', name: 'Hầm Thủ Thiêm', district: 'Quận 2' },
    { id: 'cam10', name: 'Cầu Khánh Hội', district: 'Quận 4' },
    { id: 'cam11', name: 'Ngã 4 Thủ Đức', district: 'Thủ Đức' },
    { id: 'cam12', name: 'Đại lộ Võ Văn Kiệt', district: 'Quận 1' },
];

const DISTRICTS = [
    'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 10',
    'Bình Thạnh', 'Phú Nhuận', 'Tân Bình', 'Thủ Đức', 'Gò Vấp', 'Quận 7'
];

export function useCityMockData() {
    const [cameras, setCameras] = useState<CameraStats[]>([]);

    const [districts, setDistricts] = useState<DistrictStats[]>([]);

    useEffect(() => {
        const generateCameras = () => CAMERAS.map(cam => ({
            ...cam,
            count: random(100, 500),
            trend: random(-20, 50)
        }));

        const initialCameras = generateCameras();
        setCameras(initialCameras);

        const interval = setInterval(() => {
            setCameras(prev => {
                return prev.map(cam => {
                    const change = random(-10, 25);
                    const newCount = Math.max(0, cam.count + change);

                    const trend = Math.floor((change / (cam.count || 1)) * 100);

                    return {
                        ...cam,
                        count: newCount,
                        trend: trend
                    };
                });
            });
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const topCameras = useMemo(() => {
        return [...cameras].sort((a, b) => b.count - a.count).slice(0, 5);
    }, [cameras]);

    useEffect(() => {
        const districtMap: Record<string, number> = {};

        DISTRICTS.forEach(d => {
            districtMap[d] = random(500, 2000);
        });

        cameras.forEach(cam => {
            if (districtMap[cam.district]) {
                districtMap[cam.district] += cam.count;
            } else {
                districtMap[cam.district] = cam.count;
            }
        });

        const allCalculatedDistricts = Object.entries(districtMap)
            .map(([name, count]) => ({
                name,
                count,
                trend: random(1, 40)
            }));

        setDistricts(allCalculatedDistricts);
    }, [cameras]);

    const topDistrictsList = useMemo(() => {
        return [...districts]
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [districts]);

    const trendingDistricts = useMemo(() => {
        return [...districts]
            .sort((a, b) => b.trend - a.trend)
            .slice(0, 5);
    }, [districts]);

    const [vehicleDistribution, setVehicleDistribution] = useState([
        { name: 'Xe máy', value: 4500, color: CHART_COLORS.tertiary },
        { name: 'Xe ô tô', value: 3200, color: CHART_COLORS.quinary },
        { name: 'Xe tải', value: 800, color: CHART_COLORS.senary },
        { name: 'Xe khác', value: 300, color: CHART_COLORS.septenary },
    ]);

    useEffect(() => {
        const interval = setInterval(() => {
            setVehicleDistribution(prev => prev.map(item => ({
                ...item,
                value: Math.max(100, item.value + random(-50, 60))
            })));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const generateHistory = (selectedDistricts: string[]) => {
        const points: DistrictHistoryPoint[] = [];
        const now = new Date();
        const startHour = now.getHours() - 12;

        for (let i = 0; i < 12; i++) {
            const h = startHour + i;
            const hour = h < 0 ? 24 + h : h;
            const timeStr = `${hour}:00`;

            const point: DistrictHistoryPoint = { time: timeStr };
            selectedDistricts.forEach(d => {
                let base = 1000;
                if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) base = 2500;
                if (hour > 22 || hour < 5) base = 300;
                point[d] = Math.max(0, base + random(-200, 200));
            });
            points.push(point);
        }
        return points;
    };

    return {
        topCameras,
        trendingDistricts,
        topDistricts: topDistrictsList,
        vehicleDistribution,
        generateHistory,
        allDistricts: DISTRICTS
    };
}
