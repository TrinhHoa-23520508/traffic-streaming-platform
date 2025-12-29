"use client"

import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { FiMap, FiBarChart2, FiFileText } from "react-icons/fi";

// Lazy load the heavy component - loading.tsx handles the loading state
const CityStatsDrawer = dynamic(
    () => import("@/components/city-statistics"),
    { ssr: false }
);

export default function StatisticPage() {
    const router = useRouter();

    const handleClose = () => {
        router.push('/map');
    };

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-slate-50">
            {/* Navigation Sidebar - Use Link for prefetching */}
            <div className="fixed top-6 left-2 z-[1001] pointer-events-auto">
                <div className="bg-white rounded-lg shadow-lg p-1.5 flex flex-col gap-1.5">
                    <Link
                        href="/map"
                        prefetch={true}
                        className="p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
                        title="Map"
                    >
                        <FiMap size={16} />
                    </Link>
                    <Link
                        href="/statistic"
                        prefetch={true}
                        className="p-2 rounded-md transition-colors bg-blue-500 text-white hover:bg-blue-600"
                        title="Statistic"
                    >
                        <FiBarChart2 size={16} />
                    </Link>
                    <Link
                        href="/report"
                        prefetch={true}
                        className="p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
                        title="Report"
                    >
                        <FiFileText size={16} />
                    </Link>
                </div>
            </div>

            <div className="pl-20 h-full w-full">
                <CityStatsDrawer />
            </div>
        </div>
    );
}
