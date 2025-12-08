"use client"

import { FiClock } from "react-icons/fi"
import React, { useState, useEffect } from 'react'
import InforPanel from "./infor-panel"
import { trafficApi } from "@/lib/api/trafficApi"
import { CHART_COLORS } from "./color"

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
    HIGH: 5,
    MEDIUM: 3,
    LOW: 1
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
    districts?: string[];
}

export default function TrafficAlertsPanel({ onAlertsUpdate, refreshTrigger, districts = [] }: Props) {
    const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string>("");
    const [areaDistrict, setAreaDistrict] = useState<string | undefined>("Tất cả");
    const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "all">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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

    useEffect(() => {
        setCurrentPage(1);
    }, [areaDistrict, severityFilter]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
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
                        title: `${data.cameraName}`,
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
                setLastUpdated(new Date().toLocaleString('vi-VN'));

                const unsubscribe = trafficApi.subscribe((data) => {
                    if (data.totalCount < SEVERITY_THRESHOLDS.LOW) return;

                    const alertDate = new Date(data.timestamp);
                    const today = new Date();

                    if (selectedDate) {
                        const selected = new Date(selectedDate);
                        if (!isSameDay(alertDate, selected)) return;
                    } else if (!isSameDay(alertDate, today)) {
                        return;
                    }

                    if (areaDistrict && areaDistrict !== "Tất cả" && data.district !== areaDistrict) return;

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
                    setLastUpdated(new Date().toLocaleString('vi-VN'));
                    // Call onAlertsUpdate after state update completes
                    setTimeout(() => onAlertsUpdate?.(), 0);
                });

                return unsubscribe;
            } catch (error) {
                const unsubscribe = trafficApi.subscribe((data) => {
                    if (data.totalCount < SEVERITY_THRESHOLDS.LOW) return;

                    const alertDate = new Date(data.timestamp);
                    const today = new Date();
                    if (!isSameDay(alertDate, today)) return;

                    if (areaDistrict && areaDistrict !== "Tất cả" && data.district !== areaDistrict) return;

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
                    setLastUpdated(new Date().toLocaleString('vi-VN'));
                    // Call onAlertsUpdate after state update completes
                    setTimeout(() => onAlertsUpdate?.(), 0);
                });

                return unsubscribe;
            }
        };

        let unsubscribePromise = fetchInitialData();

        return () => {
            console.log('🧹 Cleaning up traffic alerts subscription');
            unsubscribePromise.then(unsubscribe => unsubscribe?.());
        };
    }, [areaDistrict, selectedDate, onAlertsUpdate, refreshTrigger]);

    const labelBySeverity: Record<AlertSeverity, string> = {
        high: "Mức độ CAO",
        medium: "Mức độ TRUNG BÌNH",
        low: "Mức độ THẤP",
    }

    const badgeClassesBySeverity: Record<AlertSeverity, string> = {
        high: "bg-rose-50 text-rose-700 border-rose-50",
        medium: "bg-orange-50 text-orange-700 border-orange-50",
        low: "bg-amber-50 text-amber-700 border-amber-50",
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
            lastUpdated={lastUpdated}
            filterOptionHasAll={true}
            showFilter={true}
            districts={districts}
            useDateRange={false}
            dateValue={selectedDate}
            onDateChange={setSelectedDate}
            filterValue={areaDistrict}
            onFilterChange={setAreaDistrict}
            children={<div className="pb-3 h-[520px] flex flex-col justify-between">
                <div className="flex gap-2 items-center overflow-hidden scrollbar-hide flex-shrink-0">
                    {severityOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setSeverityFilter(option.value)}
                            style={severityFilter === option.value && option.value === 'all' ? {
                                backgroundColor: CHART_COLORS.quaternary,
                                borderColor: CHART_COLORS.quaternary,
                                color: 'white'
                            } : undefined}
                            className={`px-4 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 whitespace-nowrap cursor-pointer ${severityFilter === option.value
                                ? option.activeClass
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-2 h-[390px]">
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
                                    className="relative group rounded-xl bg-white border border-slate-100 p-4 cursor-pointer select-none transition-all duration-200 hover:shadow-md hover:border-sky-200 hover:bg-sky-50/30 focus:outline-none focus:ring-2 focus:ring-sky-100 min-h-[120px] flex-shrink-0 flex flex-col justify-between"
                                >

                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="text-slate-900 font-semibold text-sm leading-snug group-hover:text-sky-700 transition-colors">{a.title}</div>
                                            <div className="text-slate-500 text-xs mt-1.5 line-clamp-2">{a.description}</div>
                                        </div>
                                        <span className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeClassesBySeverity[a.severity]}`}>
                                            {labelBySeverity[a.severity]}
                                        </span>
                                    </div>

                                    <div className="text-xs text-slate-500 flex items-center gap-3 mt-3 pt-3 border-t border-slate-50 group-hover:border-sky-100/50 transition-colors">
                                        <span className="inline-flex items-center gap-1.5 text-slate-400">
                                            <FiClock className="h-3.5 w-3.5" />
                                            <span className="font-medium text-slate-600">{toReadableTime(a.time)}</span>
                                        </span>
                                        <span
                                            className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 font-medium text-[10px]"
                                            style={{ backgroundColor: CHART_COLORS.octonary, color: CHART_COLORS.tertiary }}
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

                {filteredAlerts.length > 0 && (
                    <div className="flex items-center justify-between flex-shrink-0 pt-2 h-[10px]">
                        <div className="text-xs text-gray-500">
                            Trang {currentPage} / {totalPages} ({filteredAlerts.length} cảnh báo)
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 text-xs font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-600 enabled:cursor-pointer transition-all duration-200 shadow-sm"
                            >
                                Trước
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 text-xs font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-slate-600 enabled:cursor-pointer transition-all duration-200 shadow-sm"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>}></InforPanel>
    )
}
