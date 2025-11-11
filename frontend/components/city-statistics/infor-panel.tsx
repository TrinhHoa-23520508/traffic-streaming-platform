"use client"

import Combobox from "@/components/combo-box"
import DatePicker from "../date-picker"
import React from "react";

interface InforPanelProps {
    title: string;
    children: React.ReactNode;
    filterLabel?: string;
    filterValue?: string;
    filterOptionHasAll?: boolean;
    onFilterChange?: (value: string) => void;
    showFilter?: boolean;
}

export default function InforPanel({ title, children, filterLabel = "Quận/Huyện", filterValue, onFilterChange, showFilter = true, filterOptionHasAll = false }: InforPanelProps) {
    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date())

    const districtData = [
        'Bình Chánh (huyện)',
        'Bình Tân (quận)',
        'Bình Thạnh (quận)',
        'Cần Giờ (huyện)',
        'Củ Chi (huyện)',
        'Gò Vấp (quận)',
        'Hóc Môn (huyện)',
        'Nhà Bè (huyện)',
        'Phú Nhuận (quận)',
        'Quận 1',
        'Quận 10',
        'Quận 11',
        'Quận 12',
        'Quận 3',
        'Quận 4',
        'Quận 5',
        'Quận 6',
        'Quận 7',
        'Quận 8',
        'Tân Bình (quận)',
        'Tân Phú (quận)',
        'Thành phố Thủ Đức',
    ]

    const options = filterOptionHasAll ? ['Tất cả', ...districtData] : districtData

    return (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100/80 px-6 py-4 w-full">
            <div className="flex justify-between items-start mb-4 gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-gray-900">
                        {title}
                    </h2>
                    {showFilter && options && (
                        <div className="flex items-center gap-2">
                            <label className="text-base text-gray-600" htmlFor="district-filter">{filterLabel}:</label>
                            <Combobox
                                options={options.map((d) => ({ value: d, label: d }))}
                                value={filterValue}
                                onChange={(v) => onFilterChange && onFilterChange(v ?? "")}
                                buttonClassName="w-56 h-9 justify-between text-sm"
                                popoverClassName="w-56"
                                defaultValue={filterValue}
                            />
                        </div>
                    )}
                </div>
                <DatePicker value={selectedDate} onChange={(d) => setSelectedDate(d)} />
            </div>
            {children}
        </div>
    )
}