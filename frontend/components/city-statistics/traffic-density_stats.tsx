"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import InforPanel from "./infor-panel";
import { useState, useEffect } from "react";
import { trafficApi } from "@/lib/api/trafficApi";
import type { CityStatsHourlyWS } from "@/types/city-stats";
import { CHART_COLORS } from "./color";

interface HourlyData {
    time: string;
    traffic: number;
}

interface TrafficDensityStatsProps {
    data?: CityStatsHourlyWS;
    refreshTrigger?: number;
    onLoadComplete?: () => void;
}

const generateRandomHourlyData = (): HourlyData[] => {
    return Array.from({ length: 24 }, (_, hour) => ({
        time: `${hour}:00`,
        traffic: Math.floor(Math.random() * 2000) + 500
    }));
};

export default function TrafficDensityStatisticsAreaChart({ data: wsData, refreshTrigger, onLoadComplete }: TrafficDensityStatsProps) {
    const [areaDistrict, setAreaDistrict] = useState<string | undefined>("Bình Dương");
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [chartData, setChartData] = useState<HourlyData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHourlyData = async () => {
            if (!areaDistrict) return;

            try {
                setLoading(true);
                const dateStr = (selectedDate || new Date()).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).split('/').reverse().join('-');

                const response = await trafficApi.getHourlySummary({
                    date: dateStr,
                    district: areaDistrict
                });

                console.log('📊 Hourly summary response:', response);

                const chartData: HourlyData[] = Array.from({ length: 24 }, (_, hour) => ({
                    time: `${hour}:00`,
                    traffic: response[hour] || 0
                }));

                setChartData(chartData);
            } catch (error) {
                console.error('Error fetching hourly data:', error);
                console.log('Using random data as fallback');
                setChartData(generateRandomHourlyData());
            } finally {
                setLoading(false);
                onLoadComplete?.();
            }
        };

        fetchHourlyData();
    }, [areaDistrict, selectedDate, refreshTrigger]);

    useEffect(() => {
        if (wsData && wsData.district === areaDistrict) {
            console.log('📨 WebSocket hourly data received:', wsData);

            setChartData(prevData => {
                const newData = [...prevData];
                const hourIndex = wsData.hour;

                if (hourIndex >= 0 && hourIndex < 24) {
                    newData[hourIndex] = {
                        time: `${hourIndex}:00`,
                        traffic: wsData.totalCount
                    };
                }

                return newData;
            });
        }
    }, [wsData, areaDistrict]);

    function formatNumber(n: number) {
        return n?.toLocaleString("vi-VN") ?? "0";
    }

    function CustomTooltip({ active, payload, label }: any) {
        if (!active || !payload || !payload.length) return null;
        const item = payload[0];
        const value = item?.value ?? 0;
        const color = item?.fill ?? CHART_COLORS.quinary;

        return (
            <div
                className="bg-white/95 text-gray-800 p-3 rounded-lg shadow-lg border border-gray-100"
                style={{ minWidth: 220 }}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-sm font-semibold">{label}</div>
                        <div
                            className="text-xs mt-0.5 px-2 py-0.5 font-medium border rounded rounded-sm"
                            style={{
                                backgroundColor: CHART_COLORS.octonary,
                                color: CHART_COLORS.secondary,
                                borderColor: CHART_COLORS.octonary
                            }}
                        >
                            {areaDistrict}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold">{formatNumber(value)}</div>
                        <div className="text-xs text-gray-500">xe/giờ</div>
                    </div>
                </div>
            </div>
        );
    }

    if (loading && chartData.length === 0) {
        return (
            <InforPanel
                title="Thống kê lưu lượng xe theo giờ"
                filterValue={areaDistrict}
                onFilterChange={setAreaDistrict}
                dateValue={selectedDate}
                onDateChange={setSelectedDate}
                children={<div className="w-full h-[300px] flex items-center justify-center text-gray-500">Đang tải dữ liệu...</div>}
            />
        );
    }

    return (
        <InforPanel
            title="Thống kê lưu lượng xe theo giờ"
            filterValue={areaDistrict}
            onFilterChange={setAreaDistrict}
            dateValue={selectedDate}
            onDateChange={setSelectedDate}
            children={
                <div className="relative w-full h-[300px]">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 backdrop-blur-[2px]">
                            <div className="flex items-center gap-4 bg-white/95 px-5 py-3 rounded-xl border border-white/95">

                                <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                                </svg>

                                <div className="flex flex-col">
                                    <span className="text-gray-900 dark:text-gray-100 font-semibold">Đang tải dữ liệu...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height={300}><AreaChart data={chartData} margin={{ top: 20, right: 20, left: 15, bottom: 30 }}>
                        <defs>
                            <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={CHART_COLORS.senary} stopOpacity={0.45} />
                                <stop offset="65%" stopColor={CHART_COLORS.quinary} stopOpacity={0.2} />
                                <stop offset="85%" stopColor={CHART_COLORS.quinary} stopOpacity={0.1} />
                                <stop offset="100%" stopColor={CHART_COLORS.quinary} stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid
                            strokeDasharray="0"
                            stroke="#f3f4f6" />
                        <XAxis
                            dataKey="time"
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }}
                            tickMargin={8}
                            label={{ value: 'Giờ', position: 'bottom', offset: 10 }}
                        />
                        <YAxis
                            label={{ value: 'Lưu lượng (xe/giờ)', angle: -90, position: 'insideLeft' }}
                            stroke="#9ca3af"
                            style={{ fontSize: '12px' }} />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                        <Area
                            type="monotone"
                            dataKey="traffic"
                            stroke={CHART_COLORS.quinary}
                            strokeWidth={1.5}
                            fill="url(#colorTraffic)"
                        />
                    </AreaChart></ResponsiveContainer>
                </div>
            } />
    )
}