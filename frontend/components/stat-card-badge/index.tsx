// frontend/component/stat-card-badge/index.tsx
"use client";

interface StatCardWithBadgeProps {
    label: string;
    badgeText: string;
    badgeColorClass: string; // ví dụ: 'bg-orange-500 text-white'
}

export default function StatCardWithBadge({ label, badgeText, badgeColorClass }: StatCardWithBadgeProps) {
    return (
        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center text-sm">
            <span className="text-gray-600">{label}</span>
            <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${badgeColorClass}`}>
                {badgeText.toUpperCase()}
            </span>
        </div>
    );
}