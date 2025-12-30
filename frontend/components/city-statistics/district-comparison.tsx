import { useState, useMemo, useRef } from 'react';
import { createPortal } from "react-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_COLORS } from './color';
import { FiMinimize2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import InforPanel from "./infor-panel";

import { DashboardUpdate, HourlySummaryItem } from '@/types/traffic';

interface DistrictComparisonProps {
    districts: string[];
    onSelectionChange: (selected: string[]) => void;
    liveData?: HourlySummaryItem[] | null;
}

const LINE_COLORS = [
    CHART_COLORS.quinary,
    CHART_COLORS.tertiary,
    CHART_COLORS.senary
];

export default function DistrictComparison({ districts, onSelectionChange, liveData }: DistrictComparisonProps) {
    const [selected, setSelected] = useState<string[]>(['Bình Thạnh', 'Quận 1']);

    const scrollRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    const chartData = useMemo(() => {
        if (liveData && liveData.length > 0) {
            const points: Record<string, any> = {};

            liveData.forEach(item => {
                const time = new Date(item.hour).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                if (!points[time]) {
                    points[time] = { time };
                }
                points[time][item.district] = item.totalCount;
            });

            return Object.values(points).sort((a, b) => a.time.localeCompare(b.time));
        }
        return [];
    }, [selected, liveData]);

    const handleToggle = (district: string) => {
        if (selected.includes(district)) {
            if (selected.length > 1) {
                const newSel = selected.filter(d => d !== district);
                setSelected(newSel);
                onSelectionChange(newSel);
            }
        } else {
            if (selected.length < 3) {
                const newSel = [...selected, district];
                setSelected(newSel);
                onSelectionChange(newSel);
            }
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = 150;
            if (direction === 'left') {
                current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            } else {
                current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        }
    };

    return (
        <InforPanel
            title="So sánh áp lực giao thông"
            icon={<FiMinimize2 className="w-4 h-4" />}
            className="h-full"
            showFilter={false}
            hideFilterButton={true}
            showDate={false}
        >
            <div className="flex flex-col h-full overflow-hidden">
                <div className="mb-4 flex-shrink-0">
                    <div className="relative flex items-center gap-2 -mx-2 px-2">
                        <button
                            onClick={() => scroll('left')}
                            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex-shrink-0 z-10"
                        >
                            <FiChevronLeft className="w-4 h-4" />
                        </button>

                        <div
                            ref={scrollRef}
                            className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 px-1"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {districts.map(d => {
                                const isSelected = selected.includes(d);
                                const index = selected.indexOf(d);
                                const color = isSelected && index >= 0 ? LINE_COLORS[index] : undefined;

                                return (
                                    <button
                                        key={d}
                                        onClick={() => handleToggle(d)}
                                        disabled={!isSelected && selected.length >= 3}
                                        style={isSelected ? { backgroundColor: color, borderColor: color, color: 'white' } : {}}
                                        className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-full border transition-all whitespace-nowrap
                                            ${isSelected
                                                ? 'shadow-sm'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                                            ${!isSelected && selected.length >= 3 ? 'opacity-40 cursor-not-allowed' : ''}
                                        `}
                                    >
                                        {d}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => scroll('right')}
                            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex-shrink-0 z-10"
                        >
                            <FiChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 w-full min-h-[100px] overflow-auto" ref={chartRef}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                {selected.map((d, i) => (
                                    <linearGradient key={d} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={LINE_COLORS[i]} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={LINE_COLORS[i]} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="time"
                                stroke="#64748b"
                                style={{ fontSize: '11px', fontWeight: 500 }}
                                tickMargin={10}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => value}
                            />
                            <YAxis
                                stroke="#64748b"
                                style={{ fontSize: '11px', fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '3 3' }}
                                content={({ active, payload, label, coordinate }: any) => {
                                    if (active && payload && payload.length) {
                                        const tooltipWidth = 180;
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
                                                top: box.top + coordinate.y - 50,
                                            };
                                        }

                                        const content = (
                                            <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-slate-100 text-sm" style={style}>
                                                <div className="font-semibold text-slate-700 mb-2 border-b border-slate-100 pb-1">{label}</div>
                                                <div className="space-y-1.5">
                                                    {payload.map((entry: any, idx: number) => (
                                                        <div key={idx} className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-2 h-2 rounded-full"
                                                                    style={{ backgroundColor: entry.color }}
                                                                />
                                                                <span className="text-slate-500 text-xs font-medium">{entry.name}</span>
                                                            </div>
                                                            <span className="font-bold text-slate-800 tabular-nums">
                                                                {Number(entry.value).toLocaleString()} <span className="text-xs font-normal text-slate-400">xe</span>
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );

                                        if (typeof document !== 'undefined') {
                                            return createPortal(content, document.body);
                                        }
                                        return content;
                                    }
                                    return null;
                                }}
                            />
                            {selected.map((d, i) => (
                                <Area
                                    key={d}
                                    type="monotone"
                                    dataKey={d}
                                    name={d}
                                    stroke={LINE_COLORS[i]}
                                    fill={`url(#grad-${i})`}
                                    strokeWidth={1.5}
                                />
                            ))}
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </InforPanel>
    );
}
