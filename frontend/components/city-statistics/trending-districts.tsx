import { useRef, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { FastestGrowingDistrict } from '@/types/traffic';
import { FiTrendingUp } from 'react-icons/fi';
import { CHART_COLORS } from './color';

interface TrendingDistrictsProps {
    data: FastestGrowingDistrict[] | null;
}

import InforPanel from "./infor-panel";

export default function TrendingDistricts({ data }: TrendingDistrictsProps) {
    const chartRef = useRef<HTMLDivElement>(null);

    const chartData = useMemo(() => {
        if (!data) return [];
        return data.map(item => {
            let name, trend;
            if ('district' in item) {
                name = item.district;
                trend = item.growthRate;
            } else {
                name = (item as any).name;
                trend = (item as any).trend;
            }

            return {
                name,
                trend,
                barValue: trend > 0 ? trend : 0
            };
        });
    }, [data]);

    return (
        <InforPanel
            title="Khu vực tăng trưởng nhanh"
            icon={<FiTrendingUp className="w-4 h-4" />}
            className="h-full"
            showFilter={false}
            hideFilterButton={true}
            showDate={false}
        >
            <div className="flex flex-col h-full">
                <div className="flex-1 w-full min-h-[100px] min-w-0" ref={chartRef}>
                    <ResponsiveContainer width="99%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 25, right: 10, left: 10, bottom: 40 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="name"
                                type="category"
                                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                tickMargin={12}
                            />
                            <YAxis type="number" hide />

                            <Bar dataKey="barValue" radius={[4, 4, 0, 0]} maxBarSize={50}>
                                <LabelList
                                    dataKey="trend"
                                    position="top"
                                    formatter={(value: any) => `${value > 0 ? '+' : ''}${value}%`}
                                    style={{ fill: '#059669', fontSize: '11px', fontWeight: 600 }}
                                />
                                {chartData.map((_, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={CHART_COLORS.quaternary}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-2 text-xs text-center text-slate-400">
                    So với 1 phút trước
                </div>
            </div>
        </InforPanel>
    );
}
