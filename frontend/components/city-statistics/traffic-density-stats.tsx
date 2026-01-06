"use client"

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createPortal } from 'react-dom';
import InforPanel from "./infor-panel";
import { useState, useEffect, useRef } from "react";
import { CameraList, HourlySummary, trafficApi } from "@/lib/api/trafficApi";
import type { CityStatsHourlyWS, CityStatsData } from "@/types/city-stats";
import { CHART_COLORS } from "./color";
import { DateRange } from "react-day-picker";
import { subHours, format, addHours, differenceInHours, addMinutes, differenceInMinutes } from "date-fns";
import { FiActivity } from "react-icons/fi";

interface HourlyData {
    time: Date;
    traffic: number;
}

interface TrafficDensityStatsProps {
    data?: CityStatsHourlyWS | CityStatsData;
    refreshTrigger?: number;
    onLoadComplete?: () => void;
    districts?: string[];
}

const generateRandomHourlyData = (range?: DateRange): HourlyData[] => {
    const now = new Date();
    const nowMinus2 = addMinutes(now, -2);

    const rawFrom = range?.from ? new Date(range!.from as Date) : subHours(nowMinus2, 1);
    const rawTo = range?.to ? new Date(range!.to as Date) : nowMinus2;

    const from = new Date(rawFrom);
    from.setSeconds(0, 0);
    const to = new Date(rawTo);
    to.setSeconds(0, 0);

    if (from > to) {
        const tmp = from;
        (from as any) = to;
        (to as any) = tmp;
    }

    const minutesDiff = Math.max(0, differenceInMinutes(to, from));
    const points: HourlyData[] = Array.from({ length: minutesDiff + 1 }, (_, i) => {
        const d = addMinutes(from, i);
        return {
            time: new Date(d),
            traffic: Math.floor(Math.random() * 2000) + 500
        };
    });

    return points;
};

export default function TrafficDensityStatisticsAreaChart({ data: wsData, refreshTrigger, onLoadComplete, districts = [] }: TrafficDensityStatsProps) {
    const [areaDistrict, setAreaDistrict] = useState<string>(() => {
        return districts && districts.length > 0 ? districts[0] : "Quận 1";
    });

    const [cameraQueryDistrict, setCameraQueryDistrict] = useState<string>(areaDistrict);

    useEffect(() => {
        setCameraQueryDistrict(areaDistrict);
    }, [areaDistrict]);

    useEffect(() => {
        if (districts.length > 0 && !districts.includes(areaDistrict)) {
            setAreaDistrict(districts[0]);
        }
    }, [districts, areaDistrict]);

    const [dateRange, setDateRange] = useState<DateRange>(() => {
        const now = new Date();
        const nowMinus2 = addMinutes(now, -2);

        const from = subHours(nowMinus2, 1);
        from.setSeconds(0, 0);

        const to = new Date(nowMinus2);
        to.setSeconds(0, 0);

        return { from, to };
    });

    useEffect(() => {
        const now = new Date();
        const nowMinus2 = addMinutes(now, -2);
        const from = subHours(nowMinus2, 1);
        from.setSeconds(0, 0);
        const to = new Date(nowMinus2);
        to.setSeconds(0, 0);

        if (dateRange?.from && dateRange?.to) {
            const diff = differenceInHours(dateRange.to, dateRange.from);
            if (diff > 2) {
                setDateRange({ from, to });
            }
        }
    }, []);

    const [selectedCamera, setSelectedCamera] = useState<string>("");

    const [chartData, setChartData] = useState<HourlyData[]>([]);
    const [loading, setLoading] = useState(true);
    const wsUpdateRef = useRef(false);
    const chartRef = useRef<HTMLDivElement>(null);

    const [cameraOptions, setCameraOptions] = useState<CameraList[]>([]);

    useEffect(() => {
        const fetchCameras = async () => {
            try {
                setCameraOptions([]);
                const cameras = await trafficApi.getAllCameras({ district: cameraQueryDistrict });
                setCameraOptions(cameras);
                setSelectedCamera("");
            } catch (error) {
                console.error("Failed to fetch cameras:", error);
                setCameraOptions([]);
            }
        };
        if (cameraQueryDistrict) fetchCameras();
    }, [cameraQueryDistrict, districts]);

    useEffect(() => {
        const fetchHourlyData = async () => {
            if (wsUpdateRef.current) {
                wsUpdateRef.current = false;
                return;
            }
            try {
                setLoading(true);

                const now = new Date();
                const nowMinus1 = addMinutes(now, -1);

                const startDate = dateRange?.from ? new Date(dateRange.from as Date) : subHours(nowMinus1, 1);
                startDate.setSeconds(0, 0);

                const endDate = dateRange?.to ? new Date(dateRange.to as Date) : new Date(nowMinus1);
                endDate.setSeconds(0, 0);

                const startStr = format(startDate, "yyyy-MM-dd'T'HH:mm:ss");
                const endStr = format(endDate, "yyyy-MM-dd'T'HH:mm:ss");

                const response: HourlySummary = await trafficApi.getMinuteSummary({
                    start: startStr,
                    end: endStr,
                    district: areaDistrict,
                    cameraId: selectedCamera
                });

                console.log('📊 Hourly summary response:', response);

                const valueMap = new Map<number, number>();
                for (const [timestamp, count] of Object.entries(response || {})) {
                    const parsed = new Date(timestamp);
                    if (isNaN(parsed.getTime())) {
                        console.warn('Invalid timestamp in hourly summary:', timestamp);
                        continue;
                    }
                    const minuteDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), parsed.getHours(), parsed.getMinutes(), 0, 0);
                    valueMap.set(minuteDate.getTime(), Number(count ?? 0));
                }

                const points: HourlyData[] = [];

                for (let d = new Date(startDate); d.getTime() <= endDate.getTime(); d.setMinutes(d.getMinutes() + 1)) {
                    const timePoint = new Date(d);
                    timePoint.setSeconds(0, 0);
                    const val = valueMap.get(timePoint.getTime()) ?? 0;
                    points.push({ time: timePoint, traffic: val });
                }

                setChartData(points);
            } catch (error) {
                console.error('Error fetching hourly data:', error);
                console.log('Using random data as fallback (based on selected date range)');
                setChartData(generateRandomHourlyData(dateRange));
            } finally {
                setLoading(false);
                onLoadComplete?.();
            }
        };
        console.log('Fetching hourly data with params:', { areaDistrict, dateRange, selectedCamera });
        fetchHourlyData();
    }, [areaDistrict, dateRange, refreshTrigger, selectedCamera]);

    useEffect(() => {
        console.log('📨 WebSocket hourly data received:', wsData);

        if (dateRange?.to) {
            const now = new Date();
            const nowMinus2 = addMinutes(now, -2);
            const timeDiff = Math.abs(differenceInMinutes(nowMinus2, dateRange.to));
            if (timeDiff > 1) {
                return;
            }
        }

        let newDataPoint: CityStatsHourlyWS | undefined;

        if (wsData && 'hourlySummary' in wsData) {
            const fullData = wsData as CityStatsData;
            const districtData = fullData.hourlySummary.find((d: any) => d.district === areaDistrict);
            if (districtData) {
                newDataPoint = {
                    ...districtData,
                    hour: new Date(districtData.hour)
                } as unknown as CityStatsHourlyWS;
            }
        }

        else if (wsData && 'district' in wsData) {
            newDataPoint = wsData as CityStatsHourlyWS;
        }

        if (newDataPoint && newDataPoint.district === areaDistrict) {
            const newTime = newDataPoint.hour;

            setChartData(prevData => {
                if (prevData.length === 0) return prevData;

                const lastPoint = prevData[prevData.length - 1];
                const diff = differenceInMinutes(newTime, lastPoint.time);

                if (diff === 0) {
                    const newData = [...prevData];
                    newData[newData.length - 1] = {
                        time: newTime,
                        traffic: newDataPoint!.totalCount
                    };
                    return newData;
                }

                if (diff >= 1) {
                    const newFrom = dateRange?.from ? addMinutes(dateRange.from, diff) : undefined;

                    setDateRange(prevRange => ({
                        from: newFrom || prevRange.from,
                        to: newTime
                    }));

                    const newData = [...prevData, {
                        time: newTime,
                        traffic: newDataPoint!.totalCount
                    }];

                    if (newFrom) {
                        return newData.filter(p => p.time >= newFrom);
                    }

                    if (newData.length > 61) {
                        newData.shift();
                    }

                    return newData;
                }

                return prevData;
            });

            wsUpdateRef.current = true;
        }
    }, [wsData, areaDistrict, dateRange]);

    function formatNumber(n: number) {
        return n?.toLocaleString("vi-VN") ?? "0";
    }

    function CustomTooltip({ active, payload, label, coordinate }: any) {
        if (!active || !payload || !payload.length) return null;
        const item = payload[0];
        const value = item?.value ?? 0;

        const dataPoint = payload[0].payload;
        const fullDate = dataPoint.time ? format(new Date(dataPoint.time), 'dd/MM/yyyy HH:mm') : label;

        const tooltipWidth = 260;
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
            if (leftPos < 8) {
                leftPos = box.left + coordinate.x + 20;
            }
            style = {
                ...style,
                visibility: 'visible',
                left: leftPos,
                top: box.top + coordinate.y - 50,
            };
        }

        const tooltip = (
            <div
                className="bg-white/95 backdrop-blur-sm text-slate-800 p-3 rounded-xl shadow-lg border border-slate-100"
                style={style}
            >
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-sm font-semibold text-slate-700">{fullDate}</div>
                        <div
                            className="text-xs mt-1 px-2 py-0.5 font-medium border rounded-md inline-block"
                            style={{
                                backgroundColor: CHART_COLORS.octonary,
                                color: CHART_COLORS.tertiary,
                                borderColor: CHART_COLORS.septenary
                            }}
                        >
                            {selectedCamera ? 'Camera' : (areaDistrict || 'Tất cả')}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-slate-900">{formatNumber(value)}</div>
                        <div className="text-xs text-slate-500 font-medium">xe</div>
                    </div>
                </div>
            </div>
        );

        if (typeof document !== 'undefined') {
            return createPortal(tooltip, document.body);
        }

        return tooltip;
    }

    if (loading && chartData.length === 0) {
        return (
            <InforPanel
                title="Thống kê lưu lượng xe theo giờ"
                icon={<FiActivity className="w-4 h-4" />}
                filterValue={areaDistrict}
                onFilterChange={setAreaDistrict}
                onTempFilterChange={setCameraQueryDistrict}
                districts={districts}
                useDateRange={true}
                dateRangeValue={dateRange}
                onDateRangeChange={setDateRange}
                showCameraFilter={true}
                cameraOptions={cameraOptions}
                cameraFilterValue={selectedCamera}
                onCameraFilterChange={setSelectedCamera}
                showCurrentTimeOptionInDatePicker={true}
                children={<div className="w-full h-[200px] flex items-center justify-center text-gray-500">Đang tải dữ liệu...</div>}
            />
        );
    }

    return (
        <InforPanel
            title="Thống kê lưu lượng xe theo giờ"
            icon={<FiActivity className="w-4 h-4" />}
            filterValue={areaDistrict}
            onTempFilterChange={setCameraQueryDistrict}
            onFilterChange={setAreaDistrict}
            districts={districts}
            useDateRange={true}
            dateRangeValue={dateRange}
            onDateRangeChange={setDateRange}
            showCameraFilter={true}
            cameraOptions={cameraOptions}
            cameraFilterValue={selectedCamera}
            onCameraFilterChange={setSelectedCamera}
            showCurrentTimeOptionInDatePicker={true}
            className="h-full"
            contentClassName="h-full"
            children={
                <div className="relative w-full h-full flex-1 min-h-0 flex flex-col">
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
                    <div className="flex-1 min-h-0" ref={chartRef}>
                        <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 20, right: 20, left: 15, bottom: 30 }}>
                            <defs>
                                <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={CHART_COLORS.quinary} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={CHART_COLORS.quinary} stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke="#e2e8f0" />
                            <XAxis
                                dataKey="time"
                                stroke="#64748b"
                                style={{ fontSize: '11px', fontWeight: 500 }}
                                tickMargin={10}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => {
                                    try { return format(new Date(value), 'HH:mm'); } catch { return String(value); }
                                }}
                                label={{ value: 'Thời gian', position: 'bottom', offset: 0, style: { fill: '#94a3b8', fontSize: '12px' } }}
                            />
                            <YAxis
                                label={{ value: 'Lưu lượng (xe)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: '12px' }, offset: 0 }}
                                stroke="#64748b"
                                style={{ fontSize: '11px', fontWeight: 500 }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(value) => value >= 1000 ? `${value / 1000} k` : value}
                            />
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
                </div>
            } />
    )
}