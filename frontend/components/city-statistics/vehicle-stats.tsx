"use client"

import { useEffect, useState } from "react";
import InforPanel from "./infor-panel";
import { BarChart, Bar, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from "recharts";
import { trafficApi } from "@/lib/api/trafficApi";
import type { CityStatsByDistrict } from "@/types/city-stats";

interface VehicleChartData {
    district: string;
    xeMay: number;
    xeOTo: number;
    xeTai: number;
    xeKhac: number;
}

interface VehicleStatsProps {
    data?: CityStatsByDistrict;
}

export default function VehicleStatisticsStackChart({ data }: VehicleStatsProps) {
    const [vehicleData, setVehicleData] = useState<VehicleChartData[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVehicleData = async () => {
            try {
                setLoading(true);
                const dateStr = (selectedDate || new Date()).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }).split('/').reverse().join('-');
                const response = await trafficApi.getSummaryByDistrict({ date: dateStr });

                const chartData: VehicleChartData[] = Object.entries(response).map(([district, summary]) => ({
                    district,
                    xeMay: (summary as any).detectionDetailsSummary?.motorcycle || 0,
                    xeOTo: (summary as any).detectionDetailsSummary?.car || 0,
                    xeTai: (summary as any).detectionDetailsSummary?.truck || 0,
                    xeKhac: (summary as any).detectionDetailsSummary?.other || 0,
                }));

                setVehicleData(chartData);
            } catch (error) {
                console.error('Error fetching vehicle data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchVehicleData();
    }, [selectedDate]);

    // Update chart data when WebSocket data arrives
    useEffect(() => {
        if (data) {
            const chartData: VehicleChartData[] = Object.entries(data).map(([district, summary]) => ({
                district,
                xeMay: summary.detectionDetailsSummary?.motorcycle || 0,
                xeOTo: summary.detectionDetailsSummary?.car || 0,
                xeTai: summary.detectionDetailsSummary?.truck || 0,
                xeKhac: summary.detectionDetailsSummary?.other || 0,
            }));
            setVehicleData(chartData);
        }
    }, [data]);

    if (loading && vehicleData.length === 0) {
        return (
            <InforPanel
                title="Thống kê phương tiện theo quận"
                showFilter={false}
                dateValue={selectedDate}
                onDateChange={setSelectedDate}
                children={<div className="w-full h-[320px] flex items-center justify-center text-gray-500">Đang tải dữ liệu...</div>}
            />
        );
    }

    return (
        <InforPanel
            title="Thống kê phương tiện theo quận"
            showFilter={false}
            dateValue={selectedDate}
            onDateChange={setSelectedDate}
            children={
                <div className="relative w-full h-[320px]">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 backdrop-blur-[2px]">
                            <div className="bg-white px-6 py-3 rounded-lg text-gray-700 font-medium">
                                Đang tải dữ liệu...
                            </div>
                        </div>
                    )}
                    <div className="w-full h-full overflow-y-auto overflow-x-hidden">
                        <BarChart
                            data={vehicleData}
                            barSize={40}
                            width={550}
                            height={Math.max(500, vehicleData.length * 40)}
                            layout="vertical"
                            margin={{ right: 10, left: 10, bottom: 30 }}
                        >
                            <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" />
                            <XAxis
                                dataKey="district"
                                type="number"
                                stroke="#9ca3af"
                                interval={0}
                                textAnchor="middle"
                                style={{ fontSize: '12px' }}
                                label={{ value: 'Số xe', position: 'bottom', offset: 10 }}
                            />
                            <YAxis
                                stroke="#9ca3af"
                                type="category"
                                dataKey="district"
                                style={{ fontSize: '12px' }}
                                label={{ value: 'Quận/Huyện', angle: -90, position: 'left', offset: 0 }}
                            />
                            <Tooltip labelFormatter={(label) => label} />
                            <Legend verticalAlign="top" height={24} wrapperStyle={{ paddingBottom: 8 }} />
                            <Bar dataKey="xeMay" name="Xe máy" stackId="a" fill="#1d4ed8" />
                            <Bar dataKey="xeOTo" name="Xe ô tô" stackId="a" fill="#3b82f6" />
                            <Bar dataKey="xeTai" name="Xe tải" stackId="a" fill="#60a5fa" />
                            <Bar dataKey="xeKhac" name="Xe khác" stackId="a" fill="#93c5fd" />
                        </BarChart>
                    </div>
                </div>
            }
        />
    )
}