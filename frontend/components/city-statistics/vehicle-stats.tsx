"use client"

import { useEffect, useState } from "react";
import InforPanel from "./infor-panel";
import { BarChart, Bar, CartesianGrid, Legend, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { trafficApi } from "@/lib/api/trafficApi";
import type { CityStatsByDistrict } from "@/types/city-stats";
import { CHART_COLORS } from "./color";
import { DateRange } from "react-day-picker";
import { startOfDay, format } from "date-fns";

interface VehicleChartData {
    district: string;
    xeMay: number;
    xeOTo: number;
    xeTai: number;
    xeKhac: number;
}

interface VehicleStatsProps {
    data?: CityStatsByDistrict;
    refreshTrigger?: number;
    onLoadComplete?: () => void;
}

const districts = [
    "Bình Dương", "Huyện Bình Chánh", "Huyện Củ Chi", "Huyện Hóc Môn", "Huyện Nhà Bè",
    "Quận 1", "Quận 2", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8",
    "Quận 9", "Quận 10", "Quận 11", "Quận 12", "Quận Bình Tân", "Quận Bình Thạnh",
    "Quận Gò Vấp", "Quận Phú Nhuận", "Quận Tân Bình", "Quận Tân Phú", "Quận Thủ Đức"
];

const generateRandomVehicleData = (): VehicleChartData[] => {
    const res = districts.map(district => ({
        district,
        xeMay: Math.floor(Math.random() * 4000) + 1000,
        xeOTo: Math.floor(Math.random() * 3500) + 800,
        xeTai: Math.floor(Math.random() * 800) + 100,
        xeKhac: Math.floor(Math.random() * 400) + 50
    }));


    return res.sort((a: VehicleChartData, b: VehicleChartData) => {
        const totalA = a.xeMay + a.xeOTo + a.xeTai + a.xeKhac;
        const totalB = b.xeMay + b.xeOTo + b.xeTai + b.xeKhac;
        return totalB - totalA;
    });
};

export default function VehicleStatisticsStackChart({ data, refreshTrigger, onLoadComplete }: VehicleStatsProps) {
    const [vehicleData, setVehicleData] = useState<VehicleChartData[]>([]);

    const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
        const now = new Date();
        return {
            from: startOfDay(now),
            to: now,
        };
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVehicleData = async () => {
            try {
                setLoading(true);
                const now = new Date();
                const start = dateRange?.from || startOfDay(now);
                const end = dateRange?.to || now;

                const startStr = format(start, "yyyy-MM-dd'T'HH:mm:ss");
                const endStr = format(end, "yyyy-MM-dd'T'HH:mm:ss");

                const response = await trafficApi.getDistrictSummary({ start: startStr, end: endStr });
                console.log('📊 Vehicle summary response:', response);

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
                console.log('Using random data as fallback');
                setVehicleData(generateRandomVehicleData());
            } finally {
                setLoading(false);
                onLoadComplete?.();
            }
        };

        fetchVehicleData();
    }, [dateRange, refreshTrigger]);

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

    const chartHeight = Math.max(200, vehicleData.length * 40 + 60);

    function formatNumber(n: number) {
        return n?.toLocaleString("vi-VN") ?? "0";
    }

    function CustomTooltip({ active, payload, label }: any) {
        if (!active || !payload || !payload.length) return null;

        const total = payload.reduce((sum: number, p: any) => sum + (p?.value || 0), 0);

        const defaultColors = [CHART_COLORS.tertiary, CHART_COLORS.quinary, CHART_COLORS.senary, CHART_COLORS.septenary];

        return (
            <div className="bg-white/95 backdrop-blur-sm text-slate-800 p-3 rounded-xl shadow-lg border border-slate-100" style={{ minWidth: 220 }}>
                <div className="text-sm font-bold mb-3 text-slate-800 border-b border-slate-100 pb-2">{label}</div>
                <div className="space-y-2 text-xs">
                    {payload.map((p: any, i: number) => (
                        <div key={p.dataKey ?? i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span
                                    style={{ width: 8, height: 8, background: p.fill ?? defaultColors[i] ?? defaultColors[0], display: "inline-block", borderRadius: 2 }}
                                />
                                <span className="text-slate-600 font-medium">{p.name}</span>
                            </div>
                            <div className="font-medium text-slate-700">{formatNumber(p.value)}</div>
                        </div>
                    ))}
                </div>
                <div className="border-t border-slate-100 mt-3 pt-2 text-right text-sm font-bold text-slate-900">Tổng: {formatNumber(total)}</div>
            </div>
        );
    }

    if (loading && vehicleData.length === 0) {
        return (
            <InforPanel
                title="Thống kê phương tiện theo quận"
                showFilter={false}
                useDateRange={true}
                dateRangeValue={dateRange}
                onDateRangeChange={setDateRange}
                showCameraFilter={false}
                showCurrentTimeOptionInDatePicker={true}
                children={<div className="w-full min-h-[240px] flex items-center justify-center text-gray-500">Đang tải dữ liệu...</div>}
            />
        );
    }

    return (
        <InforPanel
            title="Thống kê phương tiện theo quận"
            showFilter={false}
            useDateRange={true}
            dateRangeValue={dateRange}
            onDateRangeChange={setDateRange}
            showCameraFilter={false}
            showCurrentTimeOptionInDatePicker={true}
            children={
                <div className="relative w-full">
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
                    <div className="w-full">
                        <ResponsiveContainer width="100%" height={chartHeight}>
                            <BarChart
                                data={vehicleData}
                                barSize={20}
                                layout="vertical"
                                margin={{ right: 20, left: 15, bottom: 30 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis
                                    dataKey="district"
                                    type="number"
                                    stroke="#64748b"
                                    interval={0}
                                    textAnchor="middle"
                                    style={{ fontSize: '11px', fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(value) => value >= 1000 ? `${value / 1000}k` : value}
                                    label={{ value: 'Số xe', position: 'bottom', offset: 0, style: { fill: '#94a3b8', fontSize: '12px' } }}
                                />s
                                <YAxis
                                    stroke="#64748b"
                                    type="category"
                                    dataKey="district"
                                    style={{ fontSize: '11px', fontWeight: 500 }}
                                    width={60}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5 }} />
                                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ paddingBottom: 10, fontSize: '12px', fontWeight: 500 }} />
                                <Bar dataKey="xeMay" name="Xe máy" stackId="a" fill={CHART_COLORS.tertiary} radius={[0, 0, 0, 0]} />
                                <Bar dataKey="xeOTo" name="Xe ô tô" stackId="a" fill={CHART_COLORS.quinary} radius={[0, 0, 0, 0]} />
                                <Bar dataKey="xeTai" name="Xe tải" stackId="a" fill={CHART_COLORS.senary} radius={[0, 0, 0, 0]} />
                                <Bar dataKey="xeKhac" name="Xe khác" stackId="a" fill={CHART_COLORS.septenary} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ div>
            }
        />
    )
}