import { FiClock } from "react-icons/fi"
import React, { useState } from 'react'
import InforPanel from "./infor-panel"

type AlertSeverity = "high" | "medium" | "low"

type TrafficAlert = {
    id: string
    title: string
    description: string
    cameraId: string
    date: string
    time: string
    severity: AlertSeverity
}

export default function TrafficAlertsPanel() {
    const alerts: TrafficAlert[] = [
        {
            id: "1",
            title: "Đường Nguyễn Huệ - Quận 1",
            description: "Kẹt xe nghiêm trọng, được phát hiện tại camera NHU-001",
            date: (new Date()).toISOString().split('T')[0],
            cameraId: "NHU-001",
            time: "14:32:15",
            severity: "high",
        },
        {
            id: "2",
            title: "Đường Võ Văn Tần - Quận 3",
            description: "Kẹt xe khá nghiêm trọng, được phát hiện tại camera VVT-012",
            date: (new Date()).toISOString().split('T')[0],
            cameraId: "VVT-012",
            time: "14:28:42",
            severity: "medium",
        },
        {
            id: "3",
            title: "Đường Lê Lai - Quận 1",
            description: "Kẹt xe khá nghiêm trọng, được phát hiện tại camera DLL-01",
            date: (new Date()).toISOString().split('T')[0],
            cameraId: "DLL-01",
            time: "14:25:18",
            severity: "high",
        },
        {
            id: "4",
            title: "Đường Phạm Ngũ Lão - Quận 1",
            description: "Kẹt xe nhẹ, được phát hiện tại camera PNL-07",
            date: (new Date()).toISOString().split('T')[0],
            cameraId: "PNL-07",
            time: "14:20:31",
            severity: "low",
        },
    ]

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
        console.log("alert:selected", alert)
    }

    function toReadableTime(t: string) {
        const parts = t.split(":")
        if (parts.length >= 2) return `${parts[0]}:${parts[1]}`
        return t
    }

    const [areaDistrict, setAreaDistrict] = useState<string | undefined>("Tất cả")

    return (
        <InforPanel
            title="Cảnh báo giao thông"
            filterOptionHasAll={true}
            showFilter={true}
            filterValue={areaDistrict}
            onFilterChange={setAreaDistrict}
            children={<div className="py-3">
                <div className="flex flex-col gap-2 max-h-90 min-h-90 overflow-y-auto pr-1">
                    {alerts.length === 0 ? (
                        <div className="flex items-center justify-center text-sm text-gray-500">Không có cảnh báo giao thông nào phù hợp</div>
                    ) : (
                        alerts.map((a) => (
                            <div
                                key={a.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => onSelect(a)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(a) } }}
                                className={`rounded-sm border border-gray-100 bg-white pl-3 pr-4 py-2 cursor-pointer select-none transition-colors hover:bg-gray-50 focus:bg-gray-100 active:bg-gray-100 focus:outline-none`}
                            >
                                <div className="flex items-start justify-between gap-3 py-2">
                                    <div className="flex items-start gap-3">
                                        <div>
                                            <div className="text-black font-medium">{a.title}</div>
                                            <div className="text-gray-500 text-sm">{a.description}</div>
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
                        ))
                    )}
                </div>
            </div>}></InforPanel>
    )
}
