"use client"

import { useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import InforPanel from "./infor-panel";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { FiPieChart } from "react-icons/fi";
import { CHART_COLORS, VEHICLE_TYPE_COLORS } from "./color";
import { VehicleRatioItem } from "@/types/traffic";

interface VehicleTypeData {
    name: string;
    value: number;
    color: string;
    [key: string]: any;
}

interface VehicleTypeDistributionProps {
    data: VehicleTypeData[] | VehicleRatioItem[] | null;
}

export default function VehicleTypeDistribution({ data }: VehicleTypeDistributionProps) {

    const chartRef = useRef<HTMLDivElement>(null);

    const chartData = useMemo(() => {
        if (!data) return [];
        return data.map(item => {
            if ('vehicleType' in item) {
                const nameMap: Record<string, string> = {
                    'Motorcycle': 'Xe máy',
                    'Car': 'Xe ô tô',
                    'Truck': 'Xe tải',
                    'Bus': 'Xe buýt',
                    'Bicycle': 'Xe đạp',
                    'Other': 'Xe khác'
                };
                return {
                    name: nameMap[item.vehicleType] || item.vehicleType,
                    value: item.count,
                    color: VEHICLE_TYPE_COLORS[item.vehicleType as keyof typeof VEHICLE_TYPE_COLORS] || '#cbd5e1'
                };
            }
            return item;
        });
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <InforPanel
                title="Tỷ lệ loại phương tiện"
                icon={<FiPieChart className="w-4 h-4" />}
                className="h-full"
                showFilter={false}
                hideFilterButton={true}
                showDate={false}
            >
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    Chưa có dữ liệu
                </div>
            </InforPanel>
        );
    }

    const CustomTooltip = ({ active, payload, coordinate }: any) => {
        if (!active || !payload || !payload.length) return null;

        const item = payload[0].payload;
        const total = chartData.reduce((sum, d) => sum + d.value, 0);
        const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;

        const tooltipWidth = 200;
        let style: React.CSSProperties = {
            minWidth: tooltipWidth,
            pointerEvents: 'none',
            zIndex: 99999,
            position: 'fixed',
            visibility: 'hidden'
        };

        if (chartRef.current && coordinate) {
            const box = chartRef.current.getBoundingClientRect();
            let leftPos = box.left + coordinate.x - tooltipWidth - 20;

            if (leftPos < 20) {
                leftPos = box.left + coordinate.x + 20;
            }

            style = {
                ...style,
                visibility: 'visible',
                left: leftPos,
                top: box.top + coordinate.y - 40,
            };
        }

        const tooltip = (
            <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-100 text-sm" style={style}>
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="font-semibold text-slate-700">{item.name}</span>
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-slate-900">{item.value.toLocaleString()}</span>
                    <span className="text-slate-500 font-medium text-xs">({percent}%)</span>
                </div>
            </div>
        );

        if (typeof document !== 'undefined') {
            return createPortal(tooltip, document.body);
        }
        return tooltip;
    };

    return (
        <InforPanel
            title="Tỷ lệ loại phương tiện"
            icon={<FiPieChart className="w-4 h-4" />}
            className="h-full"
            showFilter={false}
            hideFilterButton={true}
            showDate={false}
        >
            <div className="flex flex-col h-full relative">
                <div className="flex-1 min-h-[200px]" ref={chartRef}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 0, left: 0, right: 0, bottom: 10 }}>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="45%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <Legend
                                verticalAlign="bottom"
                                height={60}
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '20px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </InforPanel>
    );
}
