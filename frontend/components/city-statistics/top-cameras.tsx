import { useRef, useEffect, useState } from 'react';
import { CameraStats } from './use-city-mock-data';
import { FiCamera } from 'react-icons/fi';
import { CHART_COLORS } from './color';

interface TopCamerasProps {
    data: CameraStats[];
    className?: string;
}

import InforPanel from "./infor-panel";

export default function TopCameras({ data, className }: TopCamerasProps) {
    return (
        <InforPanel
            title="Top camera đông nhất"
            icon={<FiCamera className="w-4 h-4" />}
            className={className}
            showFilter={false}
            hideFilterButton={true}
            showDate={false}
        >
            <div className="space-y-3">
                {data.map((cam, index) => (
                    <div key={cam.id} className="relative group">
                        <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-100 transition-all duration-300">
                            <div className={`
                                flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shadow-sm
                                ${index === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                    index === 1 ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                                        index === 2 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                            'bg-white text-slate-500 border border-slate-200'}
                            `}>
                                #{index + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-slate-800 truncate text-sm">{cam.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                    <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{cam.district}</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-lg font-bold text-slate-800 tabular-nums tracking-tight">
                                    {cam.count.toLocaleString()}
                                </div>
                                <div className="text-[10px] text-slate-400 font-medium">lượt xe</div>
                            </div>
                        </div>

                        <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-slate-100 overflow-hidden rounded-full">
                            <div
                                className="h-full bg-indigo-500/20 group-hover:bg-indigo-500/40 transition-all duration-1000"
                                style={{ width: `${Math.min(100, (cam.count / (data[0]?.count || 1)) * 100)}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </InforPanel>
    );
}
