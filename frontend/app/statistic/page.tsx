"use client"

import Link from "next/link";
import dynamic from "next/dynamic";
import { FiMap, FiBarChart2, FiFileText } from "react-icons/fi";

// Lazy load the heavy component with loading state for instant feedback
const CityStatsDrawer = dynamic(
    () => import("@/components/city-statistics"),
    { 
        ssr: false,
        loading: () => (
            <div className="h-full w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-slate-300 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-slate-600 text-sm">Loading statistics...</p>
                </div>
            </div>
        )
    }
);

export default function StatisticPage() {
    return (
        <div className="relative h-screen w-screen min-w-[320px] min-h-[500px] overflow-auto bg-slate-50">
            {/* Navigation Sidebar - Use Link for prefetching */}
            <div className="fixed top-4 sm:top-6 left-2 z-[1001] pointer-events-auto">
                <div className="bg-white rounded-lg shadow-lg p-1 sm:p-1.5 flex flex-col gap-1 sm:gap-1.5">
                    <Link
                        href="/map"
                        prefetch={true}
                        className="p-1.5 sm:p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
                        title="Map"
                    >
                        <FiMap size={14} className="sm:w-4 sm:h-4" />
                    </Link>
                    <Link
                        href="/statistic"
                        prefetch={true}
                        className="p-1.5 sm:p-2 rounded-md transition-colors bg-blue-500 text-white hover:bg-blue-600"
                        title="Statistic"
                    >
                        <FiBarChart2 size={14} className="sm:w-4 sm:h-4" />
                    </Link>
                    <Link
                        href="/report"
                        prefetch={true}
                        className="p-1.5 sm:p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
                        title="Report"
                    >
                        <FiFileText size={14} className="sm:w-4 sm:h-4" />
                    </Link>
                </div>
            </div>

            <div className="pl-14 sm:pl-20 h-full w-full">
                <CityStatsDrawer />
            </div>
        </div>
    );
}
