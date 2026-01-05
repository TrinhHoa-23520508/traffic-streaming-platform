import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from "react-dom";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CHART_COLORS } from './color';
import { FiMinimize2, FiChevronLeft, FiChevronRight, FiActivity } from 'react-icons/fi';
import InforPanel from "./infor-panel";
import { trafficApi, HourlySummary } from "@/lib/api/trafficApi";
import { subHours, format, addMinutes, differenceInMinutes } from "date-fns";
import { CityStatsHourlyWS, CityStatsData } from "@/types/city-stats";

interface DistrictComparisonProps {
    districts: string[];
    onSelectionChange?: (selected: string[]) => void;
    refreshTrigger?: number;
    wsData?: CityStatsHourlyWS | CityStatsData;
}

const LINE_COLORS = [
    CHART_COLORS.quinary,
    CHART_COLORS.tertiary,
    CHART_COLORS.senary
];

interface ChartDataPoint {
    time: string;
    timestamp: number;
    [key: string]: any;
}

const generateRandomHourlyData = (districts: string[]): ChartDataPoint[] => {
    const now = new Date();
    const from = subHours(now, 1);
    from.setSeconds(0, 0);
    const to = new Date(now);
    to.setSeconds(0, 0);

    const minutesDiff = Math.max(0, differenceInMinutes(to, from));

    return Array.from({ length: minutesDiff + 1 }, (_, i) => {
        const d = addMinutes(from, i);
        const point: ChartDataPoint = {
            time: format(d, "HH:mm"),
            timestamp: d.getTime(),
        };

        districts.forEach(district => {
            point[district] = Math.floor(Math.random() * 2000) + 500;
        });

        return point;
    });
};

const DEFAULT_DISTRICTS = [
    "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8", "Quận 10",
    "Quận 11", "Quận 12", "Bình Thạnh", "Gò Vấp", "Phú Nhuận", "Tân Bình",
    "Tân Phú", "Bình Tân", "Thủ Đức"
];

export default function DistrictComparison({ districts, onSelectionChange, refreshTrigger, wsData }: DistrictComparisonProps) {
    const effectiveDistricts = districts && districts.length > 0 ? districts : DEFAULT_DISTRICTS;

    const [selected, setSelected] = useState<string[]>(() => {
        return effectiveDistricts.slice(0, 3);
    });

    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const validSelected = selected.filter(d => effectiveDistricts.includes(d));
        if (validSelected.length === 0 && effectiveDistricts.length > 0) {
            const newSelected = effectiveDistricts.slice(0, 3);
            setSelected(newSelected);
            onSelectionChange?.(newSelected);
        } else if (validSelected.length !== selected.length) {
            setSelected(validSelected);
            onSelectionChange?.(validSelected);
        }
    }, [effectiveDistricts]);

    useEffect(() => {
        const fetchData = async () => {
            if (selected.length === 0) {
                setChartData([]);
                return;
            }

            try {
                setLoading(true);
                const now = new Date();
                const startDate = subHours(now, 1);
                startDate.setSeconds(0, 0);
                const endDate = new Date(now);
                endDate.setSeconds(0, 0);

                const startStr = format(startDate, "yyyy-MM-dd'T'HH:mm:ss");
                const endStr = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");

                const promises = selected.map(district =>
                    trafficApi.getMinuteSummary({
                        start: startStr,
                        end: endStr,
                        district: district
                    }).then(data => ({ district, data }))
                );

                const results = await Promise.all(promises);

                const timeMap = new Map<number, ChartDataPoint>();

                for (let d = new Date(startDate); d.getTime() <= endDate.getTime(); d.setMinutes(d.getMinutes() + 1)) {
                    const timePoint = new Date(d);
                    timePoint.setSeconds(0, 0);
                    const timestamp = timePoint.getTime();

                    timeMap.set(timestamp, {
                        time: format(timePoint, "HH:mm"),
                        timestamp: timestamp
                    });
                }

                results.forEach(({ district, data }) => {
                    for (const [ts, count] of Object.entries(data || {})) {
                        const parsed = new Date(ts);
                        if (isNaN(parsed.getTime())) continue;

                        const minuteDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours(), parsed.getMinutes(), 0, 0);
                        const timestamp = minuteDate.getTime();

                        const point = timeMap.get(timestamp);
                        if (point) {
                            point[district] = Number(count ?? 0);
                        }
                    }
                });

                const points = Array.from(timeMap.values()).sort((a, b) => a.timestamp - b.timestamp);

                points.forEach(p => {
                    selected.forEach(d => {
                        if (p[d] === undefined) p[d] = 0;
                    });
                });

                setChartData(points);
            } catch (error) {
                console.error('Error fetching district comparison data:', error);
                console.log('Using random data as fallback');
                setChartData(generateRandomHourlyData(selected));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selected, refreshTrigger]);

    useEffect(() => {
        if (!wsData) return;

        setChartData(prev => {
            let newChartData = [...prev];
            let hasUpdates = false;

            const processUpdate = (update: any) => {
                if (!selected.includes(update.district)) return;

                hasUpdates = true;
                const updateTime = new Date(update.hour);
                updateTime.setSeconds(0, 0);
                const timestamp = updateTime.getTime();
                const timeStr = format(updateTime, "HH:mm");

                const existingIndex = newChartData.findIndex(p => p.timestamp === timestamp);

                if (existingIndex >= 0) {
                    newChartData[existingIndex] = {
                        ...newChartData[existingIndex],
                        [update.district]: update.totalCount
                    };
                } else {
                    const newPoint: ChartDataPoint = {
                        time: timeStr,
                        timestamp: timestamp,
                        [update.district]: update.totalCount
                    };

                    selected.forEach(d => {
                        if (d !== update.district) {
                            newPoint[d] = 0;
                        }
                    });
                    newChartData.push(newPoint);
                }
            };

            if ('hourlySummary' in wsData) {
                const fullData = wsData as CityStatsData;
                fullData.hourlySummary.forEach(processUpdate);
            } else if ('district' in wsData) {
                processUpdate(wsData);
            }

            if (!hasUpdates) return prev;

            newChartData.sort((a, b) => a.timestamp - b.timestamp);

            if (newChartData.length > 0) {
                const lastPoint = newChartData[newChartData.length - 1];
                const maxTimestamp = lastPoint.timestamp;
                const minAllowedTimestamp = maxTimestamp - (60 * 60 * 1000);

                newChartData = newChartData.filter(p => p.timestamp >= minAllowedTimestamp);
            }

            return newChartData;
        });
    }, [wsData, selected]);

    const handleToggle = (district: string) => {
        if (selected.includes(district)) {
            if (selected.length > 1) {
                const newSel = selected.filter(d => d !== district);
                setSelected(newSel);
                onSelectionChange?.(newSel);
            }
        } else {
            if (selected.length < 3) {
                const newSel = [...selected, district];
                setSelected(newSel);
                onSelectionChange?.(newSel);
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
                            {effectiveDistricts.map(d => {
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
