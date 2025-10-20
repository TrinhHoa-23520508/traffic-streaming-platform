"use client"

import { ResponsiveContainer } from "recharts"

interface InforPanelProps {
    title: string;
    children: React.ReactNode
}

export default function InforPanel({ title, children }: InforPanelProps) {
    return (
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">
                    {title}
                </h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
                {children}
            </ResponsiveContainer>
        </div>
    )
}