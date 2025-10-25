"use client"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import Combobox from "@/components/combo-box"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import React from "react"
import { ChevronDownIcon } from "lucide-react"
import { format } from "date-fns"

interface InforPanelProps {
    title: string;
    children: React.ReactNode;
    filterOptions?: string[];
    filterLabel?: string;
    filterValue?: string;
    onFilterChange?: (value: string) => void;
    showFilter?: boolean;
}

export default function InforPanel({ title, children, filterOptions, filterLabel = "Quận/Huyện", filterValue, onFilterChange, showFilter = true }: InforPanelProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-gray-100/80 px-6 py-4 w-full">
            <div className="flex justify-between items-start mb-4 gap-4">
                <div className="flex flex-col gap-1">
                    <h2 className="text-xl font-bold text-gray-900">
                        {title}
                    </h2>
                    {showFilter && filterOptions && filterOptions.length > 0 && (
                        <div className="flex items-center gap-2">
                            <label className="text-base text-gray-600" htmlFor="district-filter">{filterLabel}:</label>
                            <Combobox
                                options={filterOptions.map((d) => ({ value: d, label: d }))}
                                value={filterValue}
                                onChange={(v) => onFilterChange && onFilterChange(v ?? "")}
                                buttonClassName="w-56 h-9 justify-between text-sm"
                                popoverClassName="w-56"
                                defaultValue={filterValue}
                            />
                        </div>
                    )}
                </div>
                <Calendar22 />
            </div>
            {children}
        </div>
    )
}

function Calendar22() {
    const [open, setOpen] = React.useState(false)
    const [date, setDate] = React.useState<Date | undefined>(new Date())

    return (
        <div className="flex flex-col gap-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        id="date"
                        className="w-30 justify-between font-normal cursor-pointer"
                    >
                        {date ? format(date, "dd/MM/yyyy") : "Chọn ngày"}
                        <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={(date) => {
                            setDate(date)
                            setOpen(false)
                        }}
                        captionLayout="dropdown"
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}