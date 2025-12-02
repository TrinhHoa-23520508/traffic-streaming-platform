"use client"

import Combobox from "@/components/combo-box"
import DatePicker from "../date-picker"
import React from "react";
import { CHART_COLORS } from "./color";

interface InforPanelProps {
    title: string;
    children: React.ReactNode;
    filterLabel?: string;
    filterValue?: string;
    filterOptionHasAll?: boolean;
    onFilterChange?: (value: string) => void;
    showFilter?: boolean;
    dateValue?: Date;
    onDateChange?: (date: Date | undefined) => void;
}

export default function InforPanel({ title, children, filterLabel = "Quận/Huyện", filterValue, onFilterChange, showFilter = true, filterOptionHasAll = false, dateValue, onDateChange }: InforPanelProps) {
    const [internalDate, setInternalDate] = React.useState<Date | undefined>(new Date())

    const selectedDate = dateValue !== undefined ? dateValue : internalDate;
    const handleDateChange = (date: Date | undefined) => {
        if (onDateChange) {
            onDateChange(date);
        } else {
            setInternalDate(date);
        }
    };

    const districtData = [
        'Bình Dương',
        'Huyện Bình Chánh',
        'Huyện Củ Chi',
        'Huyện Hóc Môn',
        'Huyện Nhà Bè',
        'Quận 1',
        'Quận 2',
        'Quận 3',
        'Quận 4',
        'Quận 5',
        'Quận 6',
        'Quận 7',
        'Quận 8',
        'Quận 9',
        'Quận 10',
        'Quận 11',
        'Quận 12',
        'Quận Bình Tân',
        'Quận Bình Thạnh',
        'Quận Gò Vấp',
        'Quận Phú Nhuận',
        'Quận Tân Bình',
        'Quận Tân Phú',
        'Quận Thủ Đức',
    ]

    const options = filterOptionHasAll ? ['Tất cả', ...districtData] : districtData

    return (
        <div className="bg-white rounded-2xl border border-slate-100 px-6 py-5 w-full transition-all hover:shadow-[0_4px_20px_-4px_rgba(6,81,237,0.15)]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 pb-4">
                <div className="flex flex-col gap-2">
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="w-1 h-6 rounded-full inline-block" style={{ backgroundColor: CHART_COLORS.quaternary }}></span>
                        {title}
                    </h2>
                    {showFilter && options && (
                        <div className="flex items-center gap-2 pl-3">
                            <label className="text-sm font-medium text-slate-500" htmlFor="district-filter">{filterLabel}:</label>
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

                <DatePicker value={selectedDate} onChange={handleDateChange} />

            </div>
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {children}
            </div>
        </div>
    )
}