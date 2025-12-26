import { DistrictStats } from './use-city-mock-data';
import { FiMapPin } from 'react-icons/fi';

interface TopDistrictsProps {
    data: DistrictStats[];
    className?: string;
}

import InforPanel from "./infor-panel";

export default function TopDistricts({ data, className }: TopDistrictsProps) {
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
                {data.map((dist, index) => (
                    <div key={dist.name} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-rose-100 hover:bg-rose-50/30 transition-colors">
                        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded bg-slate-100 text-slate-600 text-xs font-bold">
                            {index + 1}
                        </div>

                        <div className="flex-1 min-w-0 font-medium text-slate-700">
                            {dist.name}
                        </div>

                        <div className="text-right">
                            <span className="font-bold text-slate-900 tabular-nums">
                                {dist.count.toLocaleString()}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">xe</span>
                        </div>
                    </div>
                ))}
            </div>
        </InforPanel>
    );
}
