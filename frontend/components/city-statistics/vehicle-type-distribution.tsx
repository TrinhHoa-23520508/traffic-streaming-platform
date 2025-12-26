"use client"

import { useRef } from "react";
import { createPortal } from "react-dom";
import InforPanel from "./infor-panel";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { FiPieChart } from "react-icons/fi";

interface VehicleTypeData {
    name: string;
    value: number;
    color: string;
    [key: string]: any;
}

interface VehicleTypeDistributionProps {
    data: VehicleTypeData[];
}

export default function VehicleTypeDistribution({ data }: VehicleTypeDistributionProps) {

    const chartRef = useRef<HTMLDivElement>(null);

    const CustomTooltip = ({ active, payload, coordinate }: any) => {
        if (!active || !payload || !payload.length) return null;

        const item = payload[0].payload;
        const total = data.reduce((sum, d) => sum + d.value, 0);
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
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{ fontSize: '12px', fontWeight: 500, paddingTop: '10px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </InforPanel>
    );
}
