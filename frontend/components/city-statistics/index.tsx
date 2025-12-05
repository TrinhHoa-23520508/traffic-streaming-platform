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
    const [refreshKey, setRefreshKey] = useState(0)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [completedCount, setCompletedCount] = useState(0)
    const [isMounted, setIsMounted] = useState(false)
    const isOpen = open ?? internalOpen
    const setIsOpen = onOpenChange ?? setInternalOpen

    // Ensure client-side only rendering for timestamp
    useEffect(() => {
        setIsMounted(true)
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
        <>
            <div className="fixed inset-0 flex justify-end z-40 pointer-events-none">
                <div
                    className={`pointer-events-auto m-4 pb-3 h-[calc(100vh-2rem)] w-160 bg-white rounded-xl shadow-lg border border-gray-200 transform transition-transform duration-100 flex flex-col overflow-hidden ${isOpen ? "translate-x-0" : "translate-x-[110%]"}`}
                    role="dialog" aria-modal="true"
                >
                    <div className="flex items-center justify-between py-4 px-6 border-b border-slate-100 relative flex-none bg-white/50 backdrop-blur-sm">
                        <div>
                            <h1 className="text-slate-900 text-2xl font-bold tracking-tight">Thống kê toàn thành phố</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <RefreshButton onClick={handleRefresh} isLoading={isRefreshing} />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-full transition-all duration-200"
                                aria-label="Đóng"
                            >
                                <FiX size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        <TrafficAlertsPanel refreshTrigger={refreshKey} />
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
            size="sm"
            className={`cursor-pointer gap-2 transition-all duration-200 font-medium border shadow-sm
                ${isLoading
                    ? "bg-slate-50 border-slate-200 text-slate-400"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"}`}
            onClick={onClick}
            disabled={isLoading}
        >
            {isLoading ? 'Đang tải...' : 'Làm mới'}
        </Button>
    )
}