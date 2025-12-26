import { useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { DistrictStats } from './use-city-mock-data';
import { FiTrendingUp } from 'react-icons/fi';
import { CHART_COLORS } from './color';

interface TrendingDistrictsProps {
    data: DistrictStats[];
}

import InforPanel from "./infor-panel";

export default function TrendingDistricts({ data }: TrendingDistrictsProps) {
    const chartRef = useRef<HTMLDivElement>(null);

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
                <div className="flex-1 w-full min-h-[100px]" ref={chartRef}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
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

                            <Bar dataKey="trend" radius={[4, 4, 0, 0]} barSize={30}>
                                <LabelList
                                    dataKey="trend"
                                    position="top"
                                    formatter={(value: any) => `+${value}%`}
                                    style={{ fill: '#059669', fontSize: '11px', fontWeight: 600 }}
                                />
                                {data.map((_, index) => (
                                    <Cell
                                        key={`cell - ${index} `}
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
