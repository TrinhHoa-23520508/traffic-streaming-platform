// frontend/component/stat-card-progress/index.tsx
"use client";

interface StatCardWithProgressProps {
    label: string;
    value: string;
    progressPercent: number;
    progressColorClass: string; // ví dụ: 'bg-blue-500'
}

export default function StatCardWithProgress({ label, value, progressPercent, progressColorClass }: StatCardWithProgressProps) {
    return (
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-2 text-sm">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold text-gray-800">{value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                    className={`${progressColorClass} h-1.5 rounded-full`} 
                    style={{ width: `${progressPercent}%` }}
                ></div>
            </div>
        </div>
    );
}