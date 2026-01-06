"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface DatePickerWithRangeProps {
    className?: string
    date?: DateRange
    onDateChange?: (date: DateRange | undefined) => void
    showCurrentTimeOption?: boolean
}

export function DatePickerWithRange({
    className,
    date,
    onDateChange,
    showCurrentTimeOption = true,
}: DatePickerWithRangeProps) {
    const [open, setOpen] = React.useState(false)
    const [startTime, setStartTime] = React.useState<string>("00:00")
    const [endTime, setEndTime] = React.useState<string>("23:00")

    // Sync internal time state with props when props change
    React.useEffect(() => {
        if (date?.from) setStartTime(format(date.from, "HH:mm"))
        if (date?.to) setEndTime(format(date.to, "HH:mm"))
    }, [date])

    const updateDateWithTime = (newDateRange: DateRange | undefined, sTime: string, eTime: string) => {
        if (!newDateRange?.from) {
            onDateChange?.(newDateRange)
            return
        }

        const newFrom = new Date(newDateRange.from)
        if (sTime === "current") {
            const now = new Date()
            now.setMinutes(now.getMinutes() - 2)
            newFrom.setHours(now.getHours(), now.getMinutes())
        } else {
            const [startH, startM] = sTime.split(':').map(Number)
            newFrom.setHours(startH, startM)
        }

        let newTo = newDateRange.to ? new Date(newDateRange.to) : undefined
        if (newTo) {
            if (eTime === "current") {
                const now = new Date()
                now.setMinutes(now.getMinutes() - 2)
                newTo.setHours(now.getHours(), now.getMinutes())
            } else {
                const [endH, endM] = eTime.split(':').map(Number)
                newTo.setHours(endH, endM)
            }
        }

        onDateChange?.({ from: newFrom, to: newTo })
    }

    const handleDateSelect = (selected: DateRange | undefined) => {
        updateDateWithTime(selected, startTime, endTime)
    }

    const handleStartTimeChange = (value: string) => {
        setStartTime(value)
        updateDateWithTime(date, value, endTime)
    }

    const handleEndTimeChange = (value: string) => {
        setEndTime(value)
        updateDateWithTime(date, startTime, value)
    }

    const timeOptions = Array.from({ length: 24 }, (_, i) => {
        const h = i.toString().padStart(2, '0')
        return `${h}:00`
    })

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal cursor-pointer",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "dd/MM/yyyy HH:mm")} -{" "}
                                    {format(date.to, "dd/MM/yyyy HH:mm")}
                                </>
                            ) : (
                                format(date.from, "dd/MM/yyyy HH:mm")
                            )
                        ) : (
                            <span>Chọn khoảng thời gian</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 overflow-hidden" align="start">
                    <Calendar
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={handleDateSelect}
                        disabled={(date) => date > new Date()}
                        numberOfMonths={2}
                    />
                    <div className="p-3 border-t bg-slate-50 flex flex-col sm:flex-row items-end sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Từ giờ</span>
                                <Select
                                    value={startTime}
                                    onValueChange={handleStartTimeChange}
                                >
                                    <SelectTrigger className="h-9 w-[85px] bg-white shadow-sm">
                                        <SelectValue placeholder="Giờ" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="max-h-[200px]">
                                        {showCurrentTimeOption && <SelectItem value="current" className="font-semibold text-indigo-600">Hiện tại</SelectItem>}
                                        {!timeOptions.includes(startTime) && startTime !== "current" && (
                                            <SelectItem value={startTime}>{startTime}</SelectItem>
                                        )}
                                        {timeOptions.map((t) => (
                                            <SelectItem key={`start-${t}`} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="h-px w-2 bg-slate-300 sm:h-px sm:w-2 mt-5"></div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Đến giờ</span>
                                <Select
                                    value={endTime}
                                    onValueChange={handleEndTimeChange}
                                >
                                    <SelectTrigger className="h-9 w-[85px] bg-white shadow-sm">
                                        <SelectValue placeholder="Giờ" />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="max-h-[200px]">
                                        {showCurrentTimeOption && <SelectItem value="current" className="font-semibold text-indigo-600">Hiện tại</SelectItem>}
                                        {!timeOptions.includes(endTime) && endTime !== "current" && (
                                            <SelectItem value={endTime}>{endTime}</SelectItem>
                                        )}
                                        {timeOptions.map((t) => (
                                            <SelectItem key={`end-${t}`} value={t}>
                                                {t}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button size="sm" onClick={() => setOpen(false)} className="w-full sm:w-auto cursor-pointer">
                            Áp dụng
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}
