import { BusiestDistrictItem } from '@/types/traffic';
import { FiMapPin } from 'react-icons/fi';

interface TopDistrictsProps {
    data: BusiestDistrictItem[] | null;
    className?: string;
}

import InforPanel from "./infor-panel";

export default function TopDistricts({ data, className }: TopDistrictsProps) {
    const items = data || [];

    return (
        <InforPanel
            title="Quận nhiều xe nhất"
            icon={<FiMapPin className="w-4 h-4" />}
            className={className}
            showFilter={false}
            hideFilterButton={true}
            showDate={false}
        >
            <div className="space-y-3">
                {items.map((dist, index) => {
                    const name = 'name' in dist ? dist.name : '';
                    const count = 'count' in dist ? dist.count : 0;

                    return (
                        <div key={name} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-rose-100 hover:bg-rose-50/30 transition-colors">
                            <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-slate-100 text-slate-600 text-xs font-bold">
                                {index + 1}
                            </div>

                            <div className="flex-1 min-w-0 font-medium text-slate-700">
                                {name}
                            </div>

                            <div className="text-right">
                                <span className="font-bold text-slate-900 tabular-nums">
                                    {count.toLocaleString()}
                                </span>
                                <span className="text-xs text-slate-400 ml-1">xe</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </InforPanel>
    );
}
