"use client"

import { FiClock } from "react-icons/fi"
import React, { useState, useEffect, useRef } from 'react'
import InforPanel from "./infor-panel"
import { trafficApi } from "@/lib/api/trafficApi"
import { CHART_COLORS } from "./color"
import LoadingSpinner from "./loading-spinner"

type AlertSeverity = "high" | "medium" | "low"

type TrafficAlert = {
    id: string
    title: string
    description: string
    cameraId: string
    cameraName: string
    district: string
    date: string
    time: string
    severity: AlertSeverity
    totalCount: number
}

const SEVERITY_THRESHOLDS = {
    HIGH: 35,
    MEDIUM: 25,
    LOW: 15
} as const;

const ITEMS_PER_PAGE = 3;
const MAX_ALERTS = 100;

const getSeverity = (totalCount: number): AlertSeverity => {
    if (totalCount >= SEVERITY_THRESHOLDS.HIGH) return "high";
    if (totalCount >= SEVERITY_THRESHOLDS.MEDIUM) return "medium";
    return "low";
};

const getSeverityLabel = (totalCount: number): string => {
    if (totalCount >= SEVERITY_THRESHOLDS.HIGH) return "Kẹt xe nghiêm trọng";
    if (totalCount >= SEVERITY_THRESHOLDS.MEDIUM) return "Kẹt xe khá nghiêm trọng";
    return "Kẹt xe nhẹ";
};

const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate();
};

type Props = {
    onAlertsUpdate?: () => void;
    refreshTrigger?: number;
}

export default function TrafficAlertsPanel({ onAlertsUpdate, refreshTrigger }: Props) {
    const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
    const [areaDistrict, setAreaDistrict] = useState<string | undefined>("Tất cả");
    const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "all">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [loading, setLoading] = useState(true);

    const selectedDateRef = useRef(selectedDate);
    const areaDistrictRef = useRef(areaDistrict);
    const severityFilterRef = useRef(severityFilter);

    useEffect(() => {
        selectedDateRef.current = selectedDate;
        areaDistrictRef.current = areaDistrict;
        severityFilterRef.current = severityFilter;
    }, [selectedDate, areaDistrict, severityFilter]);

    const itemsPerPage = ITEMS_PER_PAGE;
    const maxAlerts = MAX_ALERTS;

    const filteredAlerts = alerts.filter(a => {
        const matchDistrict = areaDistrict === "Tất cả" || a.district === areaDistrict;
        const matchSeverity = severityFilter === "all" || a.severity === severityFilter;
        return matchDistrict && matchSeverity;
    });

    const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const dateStr = (selectedDate || new Date()).toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            }).split('/').reverse().join('-');

            const latestData = await trafficApi.getLatest({
                district: areaDistrict !== "Tất cả" ? areaDistrict : undefined,
                date: selectedDate ? dateStr : undefined,
            });

            const initialAlerts: TrafficAlert[] = latestData
                .filter(data => data.totalCount >= SEVERITY_THRESHOLDS.LOW)
                .map(data => ({
                    id: `${data.cameraId}-${data.id}`,
                    title: `${data.cameraName} - ${data.district}`,
                    description: `${getSeverityLabel(data.totalCount)}, được phát hiện tại camera ${data.cameraId}`,
                    cameraId: data.cameraId,
                    cameraName: data.cameraName,
                    district: data.district,
                    date: new Date(data.timestamp).toISOString().split('T')[0],
                    time: new Date(data.timestamp).toLocaleTimeString('vi-VN'),
                    severity: getSeverity(data.totalCount),
                    totalCount: data.totalCount
                }))
                .slice(0, maxAlerts);

            setAlerts(initialAlerts);
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [areaDistrict, severityFilter]);

    useEffect(() => {
        const unsubscribe = trafficApi.subscribe((data) => {
            if (data.totalCount < SEVERITY_THRESHOLDS.LOW) return;

            const alertDate = new Date(data.timestamp);
            const today = new Date();

            const currentSelectedDate = selectedDateRef.current;
            const currentAreaDistrict = areaDistrictRef.current;
            const currentSeverityFilter = severityFilterRef.current;

            if (currentSelectedDate) {
                const selected = new Date(currentSelectedDate);
                if (!isSameDay(alertDate, selected)) return;
            } else if (!isSameDay(alertDate, today)) {
                return;
            }

            if ((currentAreaDistrict && currentAreaDistrict !== "Tất cả" && data.district !== currentAreaDistrict) ||
                (currentSeverityFilter !== "all" && getSeverity(data.totalCount) !== currentSeverityFilter)
            ) return;

            const newAlert: TrafficAlert = {
                id: `${data.cameraId}-${Date.now()}`,
                title: `${data.cameraName} - ${data.district}`,
                description: `${getSeverityLabel(data.totalCount)}, được phát hiện tại camera ${data.cameraId}`,
                cameraId: data.cameraId,
                cameraName: data.cameraName,
                district: data.district,
                date: new Date(data.timestamp).toISOString().split('T')[0],
                time: new Date(data.timestamp).toLocaleTimeString('vi-VN'),
                severity: getSeverity(data.totalCount),
                totalCount: data.totalCount
            };

            setAlerts(prev => {
                const updated = [newAlert, ...prev];
                return updated.slice(0, maxAlerts);
            });
            setTimeout(() => onAlertsUpdate?.(), 0);
        });

        try {
            fetchInitialData();
        } catch (error) { }
        return () => {
            unsubscribe?.();
        };

    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [areaDistrict, selectedDate, refreshTrigger]);

    const labelBySeverity: Record<AlertSeverity, string> = {
        high: "Mức độ CAO",
        medium: "Mức độ TRUNG BÌNH",
        low: "Mức độ THẤP",
    }

    const badgeClassesBySeverity: Record<AlertSeverity, string> = {
        high: "bg-rose-50 text-rose-700 border-rose-200",
        medium: "bg-orange-50 text-orange-700 border-orange-200",
        low: "bg-amber-50 text-amber-700 border-amber-200",
    }

    function onSelect(alert: TrafficAlert) {
        const event = new CustomEvent('selectCamera', {
            detail: { cameraId: alert.cameraId }
        });
        window.dispatchEvent(event);
    }

    function toReadableTime(t: string) {
        const parts = t.split(":")
        if (parts.length >= 2) return `${parts[0]}:${parts[1]}`
        return t
    }

    const severityOptions: { value: AlertSeverity | "all", label: string, activeClass: string }[] = [
        { value: "all", label: "Tất cả", activeClass: "" },
        { value: "high", label: "Cao", activeClass: "bg-rose-600 text-white border-rose-600" },
        { value: "medium", label: "Trung bình", activeClass: "bg-orange-500 text-white border-orange-500" },
        { value: "low", label: "Thấp", activeClass: "bg-amber-400 text-white border-amber-400" },
    ];

    return (
        <InforPanel
            title="Cảnh báo giao thông"
            filterOptionHasAll={true}
            showFilter={true}
            dateValue={selectedDate}
            onDateChange={setSelectedDate}
            filterValue={areaDistrict}
            onFilterChange={setAreaDistrict}
            children={
                <div className="pb-3 h-[470px] flex flex-col">
                    <div className="flex gap-2 items-center overflow-hidden scrollbar-hide flex-shrink-0 mb-2">
                        {severityOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSeverityFilter(option.value)}
                                style={severityFilter === option.value && option.value === 'all' ? {
                                    backgroundColor: CHART_COLORS.quaternary,
                                    borderColor: CHART_COLORS.quaternary,
                                    color: 'white'
                                } : undefined}
                                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap cursor-pointer ${severityFilter === option.value
                                    ? option.activeClass
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative h-[390px]">
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 backdrop-blur-[2px] rounded-lg">
                                <LoadingSpinner />
                            </div>
                        )}

                        <div className="flex flex-col justify-between gap-2 h-full">
                            {paginatedAlerts.length === 0 ? (
                                <div className="flex items-center justify-center text-sm text-gray-500 h-full">Không có cảnh báo giao thông nào phù hợp</div>
                            ) : (
                                <>
                                    {paginatedAlerts.map((a) => (
                                        <div
                                            key={a.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => onSelect(a)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(a) } }}
                                            className="relative group rounded-lg bg-white border border-slate-100 pt-2 px-4 cursor-pointer select-none transition-colors focus:outline-none focus:ring-2 focus:ring-sky-100 hover:border-sky-400 min-h-[120px] flex-shrink-0"
                                        >

                                            <div className="flex items-start justify-between gap-4 py-1 pl-2">
                                                <div className="flex-1">
                                                    <div className="text-slate-900 font-semibold text-sm leading-tight">{a.title}</div>
                                                    <div className="text-slate-500 text-sm mt-1 min-h-[2.5rem] break-words">{a.description}</div>
                                                </div>
                                                <span className={`shrink-0 inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold border ${badgeClassesBySeverity[a.severity]}`}>
                                                    {labelBySeverity[a.severity]}
                                                </span>
                                            </div>

                                            <div className="text-xs text-slate-500 flex items-center gap-2 pl-4 mt-1">
                                                <span className="inline-flex items-center gap-2 rounded-md bg-slate-50 px-2 py-1 font-medium text-slate-600 ring-1 ring-inset ring-slate-200">
                                                    <FiClock className="h-4 w-4 text-slate-400" />
                                                    <span>{toReadableTime(a.time)}</span>
                                                </span>
                                                <span
                                                    className="inline-flex items-center gap-2 rounded-md px-2 py-1 font-medium"
                                                    style={{ backgroundColor: CHART_COLORS.octonary, color: CHART_COLORS.primary }}
                                                >
                                                    <span>{a.district}</span>
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {Array.from({ length: itemsPerPage - paginatedAlerts.length }).map((_, i) => (
                                        <div key={`placeholder-${i}`} className="min-h-[120px] flex-shrink-0" />
                                    ))}
                                </>
                            )}
                        </div>
                    </div>

                    {filteredAlerts.length > 0 && (
                        <div className="flex items-center justify-between flex-shrink-0 pt-2">
                            <div className="text-xs text-gray-500">
                                Trang {currentPage} / {totalPages} ({filteredAlerts.length} cảnh báo)
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 enabled:cursor-pointer transition-colors"
                                >
                                    Trước
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 enabled:cursor-pointer transition-colors"
                                >
                                    Sau
                                </button>
                            </div>
                        </div>
                    )}
                </div>}></InforPanel>
    )
}
