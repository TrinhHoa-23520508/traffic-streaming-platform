"use client"

import { useRouter } from "next/navigation";
import CityStatsDrawer from "@/components/city-statistics";
import { FiMap, FiBarChart2, FiFileText } from "react-icons/fi";

export default function StatisticPage() {
    const router = useRouter();

    const handleClose = () => {
        router.push('/map');
    };

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-slate-50">
            {/* Navigation Sidebar */}
            <div className="fixed top-6 left-2 z-[1001] pointer-events-auto">
                <div className="bg-white rounded-lg shadow-lg p-1.5 flex flex-col gap-1.5">
                    <button
                        onClick={() => router.push('/map')}
                        className="p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
                        title="Map"
                    >
                        <FiMap size={16} />
                    </button>
                    <button
                        onClick={() => router.push('/statistic')}
                        className="p-2 rounded-md transition-colors bg-blue-500 text-white hover:bg-blue-600"
                        title="Statistic"
                    >
                        <FiBarChart2 size={16} />
                    </button>
                    <button
                        onClick={() => router.push('/report')}
                        className="p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
                        title="Report"
                    >
                        <FiFileText size={16} />
                    </button>
                </div>
            </div>

            <div className="pl-20 h-full w-full">
                <CityStatsDrawer />
            </div>
        </div>
    );
}
