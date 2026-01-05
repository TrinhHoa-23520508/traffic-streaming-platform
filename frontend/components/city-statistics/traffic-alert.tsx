"use client"

import { FiClock, FiCamera } from "react-icons/fi"
import { IoClose } from 'react-icons/io5'
import React, { useState, useEffect } from 'react'
import InforPanel from "./infor-panel"
import { trafficApi } from "@/lib/api/trafficApi"
import { API_CONFIG } from "@/lib/api/config"
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
    maxCount: number
    imageUrl?: string
}

const SEVERITY_PERCENTAGES = {
    HIGH: 90,
    MEDIUM: 80,
    LOW: 70
} as const;

const ITEMS_PER_PAGE = 3;
const MAX_ALERTS = 100;

const getSeverity = (totalCount: number, maxCount: number): AlertSeverity => {
    if (!maxCount) return "low";
    const percentage = (totalCount / maxCount) * 100;
    if (percentage >= SEVERITY_PERCENTAGES.HIGH) return "high";
    if (percentage >= SEVERITY_PERCENTAGES.MEDIUM) return "medium";
    return "low";
};

const getSeverityLabel = (totalCount: number, maxCount: number): string => {
    if (!maxCount) return "Kẹt xe nhẹ";
    const percentage = (totalCount / maxCount) * 100;
    if (percentage >= SEVERITY_PERCENTAGES.HIGH) return "Kẹt xe nghiêm trọng";
    if (percentage >= SEVERITY_PERCENTAGES.MEDIUM) return "Kẹt xe khá nghiêm trọng";
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
    onAlertSelect?: (alert: TrafficAlert) => void;
    selectedAlert?: TrafficAlert | null;
    liveviewUrl?: string;
}

export default function TrafficAlertsPanel({ onAlertsUpdate, refreshTrigger, districts = [], onAlertSelect, selectedAlert, liveviewUrl }: Props) {
    const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
    const [lastUpdated, setLastUpdated] = useState<string>("");
    const [areaDistrict, setAreaDistrict] = useState<string | undefined>("Tất cả");
    const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "all">("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const maxAlerts = MAX_ALERTS;

    const filteredAlerts = alerts.filter(a => {
        const matchDistrict = areaDistrict === "Tất cả" || a.district === areaDistrict;
        const matchSeverity = severityFilter === "all" || a.severity === severityFilter;
        return matchDistrict && matchSeverity;
    });

    const totalPages = Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
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
                    .filter(data => {
                        const max = Number(data.maxCount) || 100;
                        const total = Number(data.totalCount);
                        return (total / max) * 100 >= SEVERITY_PERCENTAGES.LOW;
                    })
                    .map(data => {
                        const max = Number(data.maxCount) || 100;
                        const total = Number(data.totalCount);
                        return {
                            id: `${data.cameraId}-${data.id}`,
                            title: `${data.cameraName}`,
                            description: `${getSeverityLabel(total, max)}, được phát hiện tại camera ${data.cameraId}`,
                            cameraId: data.cameraId,
                            cameraName: data.cameraName,
                            district: data.district,
                            date: new Date(data.timestamp).toISOString().split('T')[0],
                            time: new Date(data.timestamp).toLocaleTimeString('vi-VN'),
                            severity: getSeverity(total, max),
                            totalCount: total,
                            maxCount: max,
                            imageUrl: data.annotatedImageUrl
                        };
                    })
                    .slice(0, maxAlerts);

                setAlerts(initialAlerts);
                setLastUpdated(new Date().toLocaleString('vi-VN'));

                const unsubscribe = trafficApi.subscribe((data) => {
                    const max = Number(data.maxCount) || 100;
                    const total = Number(data.totalCount);
                    if ((total / max) * 100 < SEVERITY_PERCENTAGES.LOW) return;

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
                        description: `${getSeverityLabel(total, max)}, được phát hiện tại camera ${data.cameraId}`,
                        cameraId: data.cameraId,
                        cameraName: data.cameraName,
                        district: data.district,
                        date: new Date(data.timestamp).toISOString().split('T')[0],
                        time: new Date(data.timestamp).toLocaleTimeString('vi-VN'),
                        severity: getSeverity(total, max),
                        totalCount: total,
                        maxCount: max,
                        imageUrl: data.annotatedImageUrl
                    };

                    setAlerts(prev => {
                        const updated = [newAlert, ...prev];
                        return updated.slice(0, maxAlerts);
                    });
                    setLastUpdated(new Date().toLocaleString('vi-VN'));
                    setTimeout(() => onAlertsUpdate?.(), 0);
                });

                return unsubscribe;
            } catch (error) {
                const unsubscribe = trafficApi.subscribe((data) => {
                    const max = Number(data.maxCount) || 100;
                    const total = Number(data.totalCount);
                    if ((total / max) * 100 < SEVERITY_PERCENTAGES.LOW) return;

                    const alertDate = new Date(data.timestamp);
                    const today = new Date();
                    if (!isSameDay(alertDate, today)) return;

                    if (areaDistrict && areaDistrict !== "Tất cả" && data.district !== areaDistrict) return;

                    const newAlert: TrafficAlert = {
                        id: `${data.cameraId}-${Date.now()}`,
                        title: `${data.cameraName} - ${data.district}`,
                        description: `${getSeverityLabel(total, max)}, được phát hiện tại camera ${data.cameraId}`,
                        cameraId: data.cameraId,
                        cameraName: data.cameraName,
                        district: data.district,
                        date: new Date(data.timestamp).toISOString().split('T')[0],
                        time: new Date(data.timestamp).toLocaleTimeString('vi-VN'),
                        severity: getSeverity(total, max),
                        totalCount: total,
                        maxCount: max,
                        imageUrl: data.annotatedImageUrl
                    };

                    setAlerts(prev => {
                        const updated = [newAlert, ...prev];
                        return updated.slice(0, maxAlerts);
                    });
                    setLastUpdated(new Date().toLocaleString('vi-VN'));
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
        if (onAlertSelect) {
            onAlertSelect(alert);
        } else {
            const event = new CustomEvent('selectCamera', {
                detail: { cameraId: alert.cameraId }
            });
            window.dispatchEvent(event);
        }
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
            className="h-full"
            contentClassName="flex flex-col h-full"
            children={<div className="h-full flex flex-col justify-between">
                <div className="flex gap-2 items-center overflow-hidden scrollbar-hide flex-shrink-0 mb-3">
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

                <CameraPreviewSection alert={selectedAlert || null} liveviewUrl={liveviewUrl} />

                <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-1 pb-2">
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

                            {Array.from({ length: Math.max(0, ITEMS_PER_PAGE - paginatedAlerts.length) }).map((_, i) => (
                                <div key={`placeholder-${i}`} className="min-h-[120px] flex-shrink-0" />
                            ))}
                        </>
                    )}
                </div>

                {filteredAlerts.length > 0 && (
                    <div className="flex items-center justify-between flex-shrink-0 py-2 h-[30px]">
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

function CameraPreviewSection({ alert, liveviewUrl }: { alert: TrafficAlert | null, liveviewUrl?: string }) {
    const [displayUrl, setDisplayUrl] = useState<string | undefined>(undefined);
    const [showImage, setShowImage] = useState<boolean>(true);

    useEffect(() => {
        if (liveviewUrl) {
            const url = `${API_CONFIG.CAMERA_API_URL}/${liveviewUrl}?t=${Date.now()}`;
            setDisplayUrl(url);
            setShowImage(Boolean(url));
        } else if (alert?.imageUrl) {
            setDisplayUrl(alert.imageUrl);
            setShowImage(Boolean(alert.imageUrl));
        } else {
            setDisplayUrl(undefined);
            setShowImage(false);
        }
    }, [alert, liveviewUrl]);

    if (!alert || !showImage) return null;

    return (
        <div className="mb-3 rounded-lg overflow-hidden relative bg-slate-100 border border-slate-200 aspect-video flex-shrink-0 group">
            {displayUrl && showImage ? (
                <div className="relative w-full h-full">
                    <img
                        src={displayUrl}
                        alt={alert.title}
                        className="w-full h-full object-cover transition-transform duration-500"
                        onError={(e) => {
                            if (alert.imageUrl && e.currentTarget.src !== alert.imageUrl) {
                                e.currentTarget.src = alert.imageUrl;
                            }
                        }}
                    />

                    <button
                        onClick={() => setShowImage(false)}
                        className="absolute top-3 right-3 z-20 rounded-md bg-white/90 border border-slate-200 text-slate-700 p-1.5 shadow-sm focus:outline-none transition"
                    >
                        <IoClose className="w-4 h-4" />
                    </button>

                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                        <div className="font-bold text-lg shadow-black drop-shadow-md">{alert.title}</div>
                        <div className="text-sm opacity-90 shadow-black drop-shadow-md">{alert.time} - {alert.date}</div>
                    </div>
                </div>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <FiCamera size={32} />
                </div>
            )}
        </div>
    )
}
