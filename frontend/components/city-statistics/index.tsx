"use client"

import { useState, useEffect, useCallback, startTransition } from "react"
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

    // Defer camera data loading to not block initial render
    useEffect(() => {
        // Use setTimeout to defer non-critical data loading
        const timer = setTimeout(() => {
            // Check cache first for instant load
            const cached = sessionStorage.getItem('camera_map_data');
            if (cached) {
                const { data, timestamp } = JSON.parse(cached);
                if (Date.now() - timestamp < 5 * 60 * 1000) {
                    setCameraMap(data);
                    return;
                }
            }
            
            fetch('/camera_api.json')
                .then(res => res.json())
                .then(data => {
                    const map: Record<string, string> = {}
                    data.forEach((cam: any) => {
                        if (cam.id && cam.liveviewUrl) {
                            map[cam.id] = cam.liveviewUrl
                        }
                    })
                    setCameraMap(map);
                    // Cache the result
                    sessionStorage.setItem('camera_map_data', JSON.stringify({
                        data: map,
                        timestamp: Date.now()
                    }));
                })
                .catch(err => console.error("Failed to load camera map", err))
        }, 100); // Defer by 100ms
        
        return () => clearTimeout(timer);
    }, [])

    // Defer districts loading to not block initial render
    useEffect(() => {
        const timer = setTimeout(() => {
            startTransition(() => {
                const fetchDistricts = async () => {
                    try {
                        const data = await trafficApi.getAllDistricts();
                        const districtNames = data.map((item: any) =>
                            typeof item === 'object' && item.districtName ? item.districtName : String(item)
                        );
                        setDistricts(districtNames);
                    } catch (error) {
                        console.error("Failed to fetch districts", error);
                    }
                };
                fetchDistricts();
            });
        }, 150); // Defer by 150ms
        
        return () => clearTimeout(timer);
    }, [])

    const handleApiComplete = useCallback(() => {
        setCompletedCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 2) {
                setIsRefreshing(false);
                return 0;
            }
            return newCount;
        });
    }, []);

    const handleRefresh = useCallback(() => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        setCompletedCount(0);
        setRefreshKey(prev => prev + 1);
    }, [isRefreshing]);

    const handleAlertSelect = useCallback((alert: TrafficAlert | null) => {
        setSelectedAlert(alert);
    }, []);

    // Defer WebSocket subscription to not block initial render
    useEffect(() => {
        const timer = setTimeout(() => {
            const unsubscribe = trafficApi.subscribeCityStats((data) => {
                setCityStatsData(data);
            });

            return () => {
                unsubscribe();
            };
        }, 200); // Defer by 200ms
        
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="flex h-screen w-full bg-slate-50 py-4 pr-8 gap-4 overflow-hidden">
            <div className="w-1/3 flex flex-col gap-4 h-full min-w-[350px]">
                <div className="h-full">
                    <TrafficAlertsPanel
                        refreshTrigger={refreshKey}
                        districts={districts}
                        onAlertSelect={handleAlertSelect}
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

                <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
                    <div className="h-[350px] flex-shrink-0">
                        <TrafficDensityStatisticsAreaChart
                            data={cityStatsData}
                            refreshTrigger={refreshKey}
                            onLoadComplete={handleApiComplete}
                            districts={districts}
                        />
                    </div>
                    <div className="flex-shrink-0">
                        <VehicleStatisticsStackChart
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
