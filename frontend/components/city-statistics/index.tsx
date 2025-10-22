"use client"

import { useState } from "react"
import { FiMenu, FiX } from "react-icons/fi"
import InforPanel from "./infor_panel"
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts"
import { Button } from "../ui/button"

const data = [
    { time: '0:00', traffic: 30 },
    { time: '1:00', traffic: 15 },
    { time: '2:00', traffic: 20 },
    { time: '3:00', traffic: 20 },
    { time: '4:00', traffic: 30 },
    { time: '5:00', traffic: 35 },
    { time: '6:00', traffic: 25 },
    { time: '7:00', traffic: 30 },
    { time: '8:00', traffic: 45 },
    { time: '9:00', traffic: 40 },
    { time: '10:00', traffic: 35 },
    { time: '11:00', traffic: 50 },
    { time: '12:00', traffic: 55 },
    { time: '13:00', traffic: 60 },
    { time: '14:00', traffic: 48 },
    { time: '15:00', traffic: 70 },
    { time: '16:00', traffic: 95 },
    { time: '17:00', traffic: 99 },
    { time: '18:00', traffic: 110 },
    { time: '19:00', traffic: 85 },
    { time: '20:00', traffic: 75 },
    { time: '21:00', traffic: 65 },
    { time: '22:00', traffic: 60 },
    { time: '23:00', traffic: 55 },
];

export default function CityStatsDrawer() {
    const [isOpen, setIsOpen] = useState(false)

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
                className={`fixed top-0 right-0 h-full w-150 bg-white shadow-sm transform transition-transform duration-100 ${isOpen ? "translate-x-0" : "translate-x-full"} z-40`}>
                <div className="flex items-center justify-between py-2 px-4 border-b border-gray-200 relative">
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
                <InforPanel title="Thống kê lưu lượng xe theo giờ" children={<AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="0" stroke="#f3f4f6" />
                    <XAxis dataKey="time" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <YAxis label={{ value: 'Lưu lượng (xe/giờ)', angle: -90, position: 'insideLeft' }} stroke="#9ca3af" style={{ fontSize: '12px' }} />
                    <Tooltip />
                    <Area
                        type="linear"
                        dataKey="traffic"
                        stroke="#3b82f6"
                        fill="url(#colorTraffic)"
                        dot={{ fill: '#3b82f6', r: 2 }}
                    />
                </AreaChart>
                } />
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