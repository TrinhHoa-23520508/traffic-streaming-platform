"use client"

import Combobox from "@/components/combo-box"
import DatePicker from "../date-picker"
import { DatePickerWithRange } from "../date-range-picker"
import React from "react";
import { CHART_COLORS } from "./color";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface InforPanelProps {
    title: string;
    children: React.ReactNode;

    filterLabel?: string;
    filterValue?: string;
    filterOptionHasAll?: boolean;
    onFilterChange?: (value: string) => void;
    showFilter?: boolean;

    showCameraFilter?: boolean;
    cameraFilterValue?: string;
    onCameraFilterChange?: (value: string) => void;
    cameraOptions?: { value: string; label: string }[];

    dateValue?: Date;
    onDateChange?: (date: Date | undefined) => void;

    useDateRange?: boolean;
    dateRangeValue?: DateRange;
    onDateRangeChange?: (range: DateRange | undefined) => void;
    showCurrentTimeOptionInDatePicker?: boolean;
}

export default function InforPanel({
    title,
    children,

    filterLabel = "Quận/Huyện",
    filterValue,
    onFilterChange,
    showFilter = true,
    filterOptionHasAll = false,

    showCameraFilter = false,
    cameraFilterValue,
    onCameraFilterChange,
    cameraOptions = [],

    dateValue,
    onDateChange,

    useDateRange = false,
    dateRangeValue,
    onDateRangeChange,
    showCurrentTimeOptionInDatePicker
}: InforPanelProps) {

    const districtData = [
        'Bình Dương', 'Huyện Bình Chánh', 'Huyện Củ Chi', 'Huyện Hóc Môn', 'Huyện Nhà Bè',
        'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7', 'Quận 8',
        'Quận 9', 'Quận 10', 'Quận 11', 'Quận 12', 'Quận Bình Tân', 'Quận Bình Thạnh',
        'Quận Gò Vấp', 'Quận Phú Nhuận', 'Quận Tân Bình', 'Quận Tân Phú', 'Quận Thủ Đức',
    ]

    const options = filterOptionHasAll ? ['Tất cả', ...districtData] : districtData
    const [open, setOpen] = React.useState(false);

    const [tempFilterValue, setTempFilterValue] = React.useState(filterValue);
    const [tempCameraValue, setTempCameraValue] = React.useState(cameraFilterValue);
    const [tempDateValue, setTempDateValue] = React.useState(dateValue);
    const [tempDateRangeValue, setTempDateRangeValue] = React.useState(dateRangeValue);

    React.useEffect(() => {
        if (open) {
            setTempFilterValue(filterValue);
            setTempCameraValue(cameraFilterValue);
            setTempDateValue(dateValue);
            setTempDateRangeValue(dateRangeValue);
        }
    }, [open, filterValue, cameraFilterValue, dateValue, dateRangeValue]);

    const handleApply = () => {
        if (onFilterChange && tempFilterValue !== undefined) onFilterChange(tempFilterValue);
        if (onCameraFilterChange && tempCameraValue !== undefined) onCameraFilterChange(tempCameraValue);
        if (onDateChange && tempDateValue !== undefined) onDateChange(tempDateValue);
        if (onDateRangeChange && tempDateRangeValue !== undefined) onDateRangeChange(tempDateRangeValue);
        setOpen(false);
    };

    const renderActiveFilters = () => {
        return (
            <div className="flex flex-wrap gap-2 mt-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 transition-colors hover:bg-slate-200">
                    {useDateRange ? (
                        dateRangeValue?.from ? (
                            <>
                                {format(dateRangeValue.from, "dd/MM/yyyy HH:mm")}
                                {dateRangeValue.to && ` - ${format(dateRangeValue.to, "dd/MM/yyyy HH:mm")}`}
                            </>
                        ) : "Chưa chọn ngày"
                    ) : (
                        dateValue ? format(dateValue, "dd/MM/yyyy") : "Chưa chọn ngày"
                    )}
                </div>

                {showFilter && filterValue && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100 transition-colors hover:bg-indigo-100">
                        {filterValue}
                    </div>
                )}

                {showCameraFilter && cameraFilterValue && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100 transition-colors hover:bg-emerald-100">
                        {cameraOptions.find(c => c.value === cameraFilterValue)?.label || cameraFilterValue}
                        {onCameraFilterChange && (
                            <button onClick={() => onCameraFilterChange("")} className="hover:text-emerald-900 ml-1 cursor-pointer rounded-full p-0.5 hover:bg-emerald-200/50">
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200/60 px-6 py-5 w-full transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300/80 group">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-50 pb-4 mb-2">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <span className="w-1 h-6 rounded-full inline-block" style={{ backgroundColor: CHART_COLORS.quaternary }}></span>
                        {title}
                    </h2>
                    {renderActiveFilters()}
                </div>

                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-2 text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm cursor-pointer rounded-lg transition-all duration-200">
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="hidden sm:inline font-medium">Bộ lọc</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="end">
                        <div className="space-y-4">
                            <div className="font-semibold text-sm text-slate-900 border-b pb-2">Tùy chỉnh hiển thị</div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-500">Thời gian</label>
                                {useDateRange ? (
                                    <DatePickerWithRange
                                        date={tempDateRangeValue}
                                        onDateChange={setTempDateRangeValue}
                                        showCurrentTimeOption={showCurrentTimeOptionInDatePicker}
                                    />
                                ) : (
                                    <div className="w-full [&>div]:w-full [&>div>button]:w-full">
                                        <DatePicker value={tempDateValue} onChange={setTempDateValue} />
                                    </div>
                                )}
                            </div>

                            {showFilter && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">{filterLabel}</label>
                                    <Combobox
                                        options={options.map((d) => ({ value: d, label: d }))}
                                        value={tempFilterValue}
                                        onChange={(v) => setTempFilterValue(v ?? "")}
                                        buttonClassName="w-full justify-between"
                                        popoverClassName="w-[280px]"
                                        defaultValue={tempFilterValue}
                                    />
                                </div>
                            )}

                            {showCameraFilter && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-500">Camera</label>
                                    <Combobox
                                        options={cameraOptions}
                                        value={tempCameraValue}
                                        onChange={(v) => setTempCameraValue(v ?? "")}
                                        buttonClassName="w-full justify-between"
                                        popoverClassName="w-[280px]"
                                        placeholder="Chọn camera..."
                                        searchPlaceholder="Tìm camera..."
                                    />
                                </div>
                            )}

                            <div className="pt-2 flex justify-end">
                                <Button size="sm" onClick={handleApply} className="cursor-pointer">Áp dụng</Button>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                {children}
            </div>
        </div>
    )
}