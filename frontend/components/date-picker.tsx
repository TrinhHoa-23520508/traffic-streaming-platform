import { ChevronDownIcon } from "lucide-react"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { format } from "date-fns"
import { Calendar } from "./ui/calendar"
import React from "react"

type DatePickerProps = {
    value?: Date | undefined
    onChange?: (d?: Date) => void
    /** Cho phép chọn ngày trong tương lai (mặc định: false - chỉ cho chọn ngày quá khứ) */
    allowFuture?: boolean
    /** Ngày tối thiểu có thể chọn */
    minDate?: Date
    /** Ngày tối đa có thể chọn */
    maxDate?: Date
}

export default function DatePicker({ value, onChange, allowFuture = false, minDate, maxDate }: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

    // Xác định logic disabled cho calendar
    const getDisabledDates = (date: Date): boolean => {
        // Nếu có minDate, không cho chọn ngày trước minDate
        if (minDate) {
            const minDateOnly = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
            if (dateOnly < minDateOnly) return true
        }
        
        // Nếu có maxDate, không cho chọn ngày sau maxDate
        if (maxDate) {
            const maxDateOnly = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
            if (dateOnly > maxDateOnly) return true
        }
        
        // Nếu không cho phép tương lai, chặn các ngày sau hôm nay
        if (!allowFuture && date > new Date()) return true
        
        return false
    }

    return (
        <div className="flex flex-col gap-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        id="date"
                        className="w-30 justify-between font-normal cursor-pointer"
                    >
                        {value ? format(value, "dd/MM/yyyy") : "Chọn ngày"}
                        <ChevronDownIcon className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={value}
                        onSelect={(d) => {
                            onChange?.(d)
                            setOpen(false)
                        }}
                        disabled={getDisabledDates}
                        captionLayout="dropdown"
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}