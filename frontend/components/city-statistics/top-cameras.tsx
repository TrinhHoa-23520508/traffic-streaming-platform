import { BusiestCameraItem } from '@/types/traffic';
import { FiCamera } from 'react-icons/fi';

interface TopCamerasProps {
    data: BusiestCameraItem[] | null;
    className?: string;
}

import InforPanel from "./infor-panel";

export default function TopCameras({ data, className }: TopCamerasProps) {
    const items = data || [];
    const maxCount = items.length > 0 ? (typeof items[0].count === 'number' ? items[0].count : 1) : 1;

    return (
        <InforPanel
            title="Top camera đông nhất"
            icon={<FiCamera className="w-3 h-3 sm:w-4 sm:h-4" />}
            className={className}
            showFilter={false}
            hideFilterButton={true}
            showDate={false}
        >
            <div className="space-y-1.5 sm:space-y-2">
                {items.map((cam, index) => {
                    const id = 'id' in cam ? String(cam.id) : String(cam.name);
                    const name = String(cam.name);
                    const district = 'district' in cam ? String(cam.district) : '';
                    const count = typeof cam.count === 'number' ? cam.count : 0;

                    return (
                        <div key={id} className="relative group">
                            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-100 transition-all duration-300">
                                <div className={`
                                    flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full font-bold text-[10px] sm:text-sm shadow-sm
                                    ${index === 0 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                        index === 1 ? 'bg-slate-200 text-slate-700 border border-slate-300' :
                                            index === 2 ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                                                'bg-white text-slate-500 border border-slate-200'}
                                `}>
                                    #{index + 1}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-slate-800 truncate text-xs sm:text-sm">{name}</h4>
                                    <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-slate-500 mt-0.5">
                                        {district && <span className="bg-white px-1 sm:px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[80px] sm:max-w-none">{district}</span>}
                                    </div>
                                </div>

                                <div className="text-right flex-shrink-0">
                                    <div className="text-sm sm:text-lg font-bold text-slate-800 tabular-nums tracking-tight">
                                        {count.toLocaleString()}
                                    </div>
                                    <div className="text-[8px] sm:text-[10px] text-slate-400 font-medium">lượt xe</div>
                                </div>
                            </div>

                            <div className="absolute bottom-0 left-2 right-2 sm:left-3 sm:right-3 h-[2px] bg-slate-100 overflow-hidden rounded-full">
                                <div
                                    className="h-full bg-indigo-500/20 group-hover:bg-indigo-500/40 transition-all duration-1000"
                                    style={{ width: `${Math.min(100, (count / (maxCount || 1)) * 100)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </InforPanel>
    );
}
