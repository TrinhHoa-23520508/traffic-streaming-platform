"use client"

import { useState } from "react"
import { FiMenu, FiX } from "react-icons/fi"
import { Button } from "../ui/button"
import TrafficDensityStatisticsAreaChart from "./traffic-density_stats"
import VehicleStatisticsStackChart from "./vehicle-stats"
import TrafficAlertsPanel from "./traffic-alert"

const districtData = [
    'Bình Chánh (huyện)',
    'Bình Tân (quận)',
    'Bình Thạnh (quận)',
    'Cần Giờ (huyện)',
    'Củ Chi (huyện)',
    'Gò Vấp (quận)',
    'Hóc Môn (huyện)',
    'Nhà Bè (huyện)',
    'Phú Nhuận (quận)',
    'Quận 1',
    'Quận 10',
    'Quận 11',
    'Quận 12',
    'Quận 3',
    'Quận 4',
    'Quận 5',
    'Quận 6',
    'Quận 7',
    'Quận 8',
    'Tân Bình (quận)',
    'Tân Phú (quận)',
    'Thành phố Thủ Đức',
]

export default function CityStatsDrawer() {
    const [isOpen, setIsOpen] = useState(false)
    const districtOptions = districtData
    const [areaDistrict, setAreaDistrict] = useState<string | undefined>("Quận 1")

    return (
        <>
            {!isOpen && <div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed top-3 right-30 z-50 bg-white text-black p-3 rounded-full shadow-lg transition hover:bg-gray-50 cursor-pointer">
                    <FiMenu size={18} />
                </button>
            </div>}

            <div
                className={`fixed top-0 right-0 h-full w-150 bg-white shadow-sm transform transition-transform duration-100 ${isOpen ? "translate-x-0" : "translate-x-full"} z-40 flex flex-col`}
                role="dialog" aria-modal="true">
                <div className="flex items-center justify-between py-2 px-4 border-b border-gray-200 relative flex-none">
                    <div>
                        <h1 className="text-black text-2xl font-semibold">Thống kê toàn thành phố</h1>
                        <h2 className="text-gray-500 text-sm">Cập nhật lần cuối: <span className="text-gray-400 text-xs">01/01/2025 12:00:00</span></h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <RefreshButton />
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-500 hover:text-black cursor-pointer"
                        >
                            <FiX size={25} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4 flex flex-col gap-3">
                    <TrafficAlertsPanel />
                    <TrafficDensityStatisticsAreaChart
                        filterOptions={districtOptions}
                        filterValue={areaDistrict}
                        onFilterChange={setAreaDistrict}
                    />
                    <VehicleStatisticsStackChart />
                </div>
            </div>
        </>
    )
}

function RefreshButton() {
    return (
        <Button variant="outline" className="cursor-pointer">
            Làm mới
        </Button>
    )
}