"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import InforPanel from "./infor-panel";
import { useState, useEffect } from "react";
import { trafficApi } from "@/lib/api/trafficApi";
import type { CityStatsHourlyWS } from "@/types/city-stats";

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
                            <div className="bg-white px-6 py-3 rounded-lg text-gray-700 font-medium">
                                Đang tải dữ liệu...
                            </div>
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height={300}><AreaChart data={chartData} margin={{ top: 20, right: 12, left: 8, bottom: 30 }}>
                        <defs>
                            <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.45} />
                                <stop offset="65%" stopColor="#3b82f6" stopOpacity={0.2} />
                                <stop offset="85%" stopColor="#3b82f6" stopOpacity={0.1} />
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
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
                        <Tooltip />
                        <Area
                            type="linear"
                            dataKey="traffic"
                            stroke="#3b82f6"
                            fill="url(#colorTraffic)"
                            dot={{ fill: '#3b82f6', r: 2 }}
                        />
                    </AreaChart></ResponsiveContainer>
                </div>
            } />
    )
}