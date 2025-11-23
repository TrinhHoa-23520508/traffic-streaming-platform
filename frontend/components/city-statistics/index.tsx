"use client"

import { useState, useEffect } from "react"
import { FiX } from "react-icons/fi"
import { Button } from "../ui/button"
import TrafficDensityStatisticsAreaChart from "./traffic-density_stats"
import VehicleStatisticsStackChart from "./vehicle-stats"
import TrafficAlertsPanel from "./traffic-alert"
import { trafficApi } from "@/lib/api/trafficApi"

type CityStatsDrawerProps = {
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export default function CityStatsDrawer({ open, onOpenChange }: CityStatsDrawerProps) {
    const [internalOpen, setInternalOpen] = useState(false)
    const [cityStatsData, setCityStatsData] = useState<any>(null)
    const [lastUpdate, setLastUpdate] = useState<string>('')
    const [refreshKey, setRefreshKey] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [completedCount, setCompletedCount] = useState(0)
    const isOpen = open ?? internalOpen
    const setIsOpen = onOpenChange ?? setInternalOpen

    const handleApiComplete = () => {
        setCompletedCount(prev => {
            const newCount = prev + 1;
            if (newCount >= 2) {
                setIsRefreshing(false);
                setLastUpdate(new Date().toLocaleString('vi-VN'));
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
        setLastUpdate(new Date().toLocaleString('vi-VN'));
    }, []);

    useEffect(() => {
        console.log('Setting up city stats WebSocket subscription...');

        const unsubscribe = trafficApi.subscribeCityStats((data) => {
            console.log('City stats data received in component:', data);
            setCityStatsData(data);
            setLastUpdate(new Date().toLocaleString('vi-VN'));
        });

        return () => {
            console.log('Cleaning up city stats subscription');
            unsubscribe();
        };
    }, []);

    return (
        <>
            <div className="fixed inset-0 flex justify-end z-40 pointer-events-none">
                <div
                    className={`pointer-events-auto m-4 pb-3 h-[calc(100vh-2rem)] w-160 bg-white rounded-xl shadow-lg border border-gray-200 transform transition-transform duration-100 flex flex-col overflow-hidden ${isOpen ? "translate-x-0" : "translate-x-[110%]"}`}
                    role="dialog" aria-modal="true"
                >
                    <div className="flex items-center justify-between py-2 px-4 border-b border-gray-200 relative flex-none bg-white">
                        <div className="ml-2">
                            <h1 className="text-black text-[26px] font-bold">Thống kê toàn thành phố</h1>
                            <h2 className="text-gray-500 text-[14px]">
                                Cập nhật lần cuối:
                                <span className="text-gray-400 text-[13px] ml-1">
                                    {lastUpdate || new Date().toLocaleString('vi-VN')}
                                </span>
                            </h2>
                        </div>
                        <div className="flex items-center gap-3">
                            <RefreshButton onClick={handleRefresh} isLoading={isRefreshing} />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-500 hover:text-black cursor-pointer p-1 rounded-md transition-colors"
                                aria-label="Đóng"
                            >
                                <FiX size={25} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 flex flex-col gap-3">
                        <TrafficAlertsPanel onAlertsUpdate={() => setLastUpdate(new Date().toLocaleString('vi-VN'))} />
                        <TrafficDensityStatisticsAreaChart
                            data={cityStatsData}
                            refreshTrigger={refreshKey}
                            onLoadComplete={handleApiComplete}
                        />
                        <VehicleStatisticsStackChart
                            refreshTrigger={refreshKey}
                            onLoadComplete={handleApiComplete}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}

function RefreshButton({ onClick, isLoading }: { onClick: () => void; isLoading: boolean }) {
    return (
        <Button
            variant="outline"
            className={`cursor-pointer px-3 py-1 rounded-md transition 
                ${isLoading ? "bg-gray-50 border-gray-200 text-gray-700" : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"}`}
            onClick={onClick}
            disabled={isLoading}
        >
            {isLoading ? 'Đang tải...' : 'Làm mới'}
        </Button>
    )
}