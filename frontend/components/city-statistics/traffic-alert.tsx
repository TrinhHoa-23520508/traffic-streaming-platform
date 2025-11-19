"use client"

import { FiClock } from "react-icons/fi"
import React, { useState, useEffect } from 'react'
import InforPanel from "./infor-panel"
import { trafficApi } from "@/lib/api/trafficApi"
import type { TrafficMetricsDTO } from "@/types/traffic"

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
    HIGH: 20,
    MEDIUM: 15,
    LOW: 8
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

export default function TrafficAlertsPanel() {
    const [alerts, setAlerts] = useState<TrafficAlert[]>([]);
    const [areaDistrict, setAreaDistrict] = useState<string | undefined>("Tất cả");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = ITEMS_PER_PAGE;
    const maxAlerts = MAX_ALERTS;

    const filteredAlerts = areaDistrict === "Tất cả"
        ? alerts
        : alerts.filter(a => a.district === areaDistrict);

    const totalPages = Math.ceil(filteredAlerts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedAlerts = filteredAlerts.slice(startIndex, endIndex);

    useEffect(() => {
        setCurrentPage(1);
    }, [areaDistrict]);

    useEffect(() => {
        console.log('🚦 Setting up traffic alerts WebSocket subscription...');

        const unsubscribe = trafficApi.subscribe((data: TrafficMetricsDTO) => {
            if (data.totalCount < SEVERITY_THRESHOLDS.LOW) return;

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
                // const filtered = prev.filter(a => a.cameraId !== data.cameraId);
                const updated = [newAlert, ...prev];
                return updated.slice(0, maxAlerts);
            });
        });

        return () => {
            console.log('🧹 Cleaning up traffic alerts subscription');
            unsubscribe();
        };
    }, []);

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

    return (
        <InforPanel
            title="Cảnh báo giao thông"
            filterOptionHasAll={true}
            showFilter={true}
            filterValue={areaDistrict}
            onFilterChange={setAreaDistrict}
            children={<div className="py-3 h-[444px] flex flex-col justify-between">
                <div className="flex flex-col gap-2 h-[376px]">
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
                                    className={`rounded-sm border border-gray-100 bg-white pl-3 pr-4 py-2 cursor-pointer select-none transition-colors hover:bg-gray-50 focus:bg-gray-100 active:bg-gray-100 focus:outline-none min-h-[120px]`}
                                >
                                    <div className="flex items-start justify-between gap-3 py-1">
                                        <div className="flex items-start gap-3">
                                            <div>
                                                <div className="text-black font-medium">{a.title}</div>
                                                <div className="text-gray-500 text-sm min-h-[2.5rem]">{a.description}</div>
                                            </div>
                                        </div>
                                        <span className={`shrink-0 inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-medium border ${badgeClassesBySeverity[a.severity]}`}>{labelBySeverity[a.severity]}</span>
                                    </div>
                                    <div className="mt-1.5 text-xs text-gray-500 flex items-center gap-2 pl-0">
                                        <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-50 px-1.5 py-0.5 font-medium text-gray-600 ring-1 ring-inset ring-gray-200">
                                            <FiClock className="h-3 w-3 text-gray-400" />
                                            <span>{toReadableTime(a.time)}</span>
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {Array.from({ length: itemsPerPage - paginatedAlerts.length }).map((_, i) => (
                                <div key={`placeholder-${i}`} className="min-h-[120px]" />
                            ))}
                        </>
                    )}
                </div>

                {filteredAlerts.length > 0 && (
                    <div className="flex items-center justify-between pt-3 h-[52px]">
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
