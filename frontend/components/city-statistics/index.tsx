"use client"

import { useState, useEffect } from "react"
import { FiCamera, FiRefreshCw } from "react-icons/fi"
import { Button } from "../ui/button"
import TrafficDensityStatisticsAreaChart from "./traffic-density_stats"
import VehicleStatisticsStackChart from "./vehicle-stats"
import TrafficAlertsPanel from "./traffic-alert"
import { trafficApi } from "@/lib/api/trafficApi"
import InforPanel from "./infor-panel"

type AlertSeverity = "high" | "medium" | "low"
type TrafficAlert = {
    id: string
    title: string
    description: string
    cameraId: string
    cameraName: string
    district: string
    date: string
    time: string
    severity: AlertSeverity
    totalCount: number
    imageUrl?: string
}

export default function CityStatisticsPage() {
    const [cityStatsData, setCityStatsData] = useState<any>(null)
    const [districts, setDistricts] = useState<string[]>([])
    const [refreshKey, setRefreshKey] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [completedCount, setCompletedCount] = useState(0)
    const [selectedAlert, setSelectedAlert] = useState<TrafficAlert | null>(null)
    const [cameraMap, setCameraMap] = useState<Record<string, string>>({})

    useEffect(() => {
        fetch('/camera_api.json')
            .then(res => res.json())
            .then(data => {
                const map: Record<string, string> = {}
                data.forEach((cam: any) => {
                    if (cam.id && cam.liveviewUrl) {
                        map[cam.id] = cam.liveviewUrl
                    }
                })
                setCameraMap(map)
            })
            .catch(err => console.error("Failed to load camera map", err))
    }, [])

    // Ensure client-side only rendering for timestamp
    useEffect(() => {
        const fetchDistricts = async () => {
            try {
                const data = await trafficApi.getAllDistricts();
                // Handle case where backend returns object { districtName: "..." } instead of string
                const districtNames = data.map((item: any) =>
                    typeof item === 'object' && item.districtName ? item.districtName : String(item)
                );
                setDistricts(districtNames);
            } catch (error) {
                console.error("Failed to fetch districts", error);
            }
        };
        fetchDistricts();
    }, [])

    const handleApiComplete = () => {
        setCompletedCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 2) {
                setIsRefreshing(false);
                return 0;
            }
            return newCount;
        });
    };

    const handleRefresh = () => {
        if (isRefreshing) return;
        console.log('Refreshing all city stats...');
        setIsRefreshing(true);
        setCompletedCount(0);
        setRefreshKey(prev => prev + 1);
    };

    useEffect(() => {
        console.log('Setting up city stats WebSocket subscription...');

        const unsubscribe = trafficApi.subscribeCityStats((data) => {
            console.log('City stats data received in component:', data);
            setCityStatsData(data);
        });

        return () => {
            console.log('Cleaning up city stats subscription');
            unsubscribe();
        };
    }, []);

    return (
        <div className="flex h-screen w-full bg-slate-50 py-4 pr-8 gap-4 overflow-hidden">
            <div className="w-1/3 flex flex-col gap-4 h-full min-w-[350px]">
                <div className="h-full">
                    <TrafficAlertsPanel
                        refreshTrigger={refreshKey}
                        districts={districts}
                        onAlertSelect={setSelectedAlert}
                        selectedAlert={selectedAlert}
                        liveviewUrl={selectedAlert ? cameraMap[selectedAlert.cameraId] : undefined}
                    />
                </div>
            </div>

            <div className="w-2/3 flex flex-col gap-4 h-full min-w-[600px]">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex-shrink-0">
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Thống kê toàn thành phố</h1>
                    <RefreshButton onClick={handleRefresh} isLoading={isRefreshing} />
                </div>

                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <div className="flex-1 min-h-0">
                        <VehicleStatisticsStackChart
                            refreshTrigger={refreshKey}
                            onLoadComplete={handleApiComplete}
                            districts={districts}
                        />
                    </div>
                    <div className="flex-1 min-h-0">
                        <TrafficDensityStatisticsAreaChart
                            data={cityStatsData}
                            refreshTrigger={refreshKey}
                            onLoadComplete={handleApiComplete}
                            districts={districts}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

function RefreshButton({ onClick, isLoading }: { onClick: () => void; isLoading: boolean }) {
    return (
        <Button
            variant="outline"
            size="sm"
            className={`cursor-pointer gap-2 transition-all duration-200 font-medium border shadow-sm
                ${isLoading
                    ? "bg-slate-50 border-slate-200 text-slate-400"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"}`}
            onClick={onClick}
            disabled={isLoading}
        >
            <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Đang tải...' : 'Làm mới dữ liệu'}
        </Button>
    )
}
