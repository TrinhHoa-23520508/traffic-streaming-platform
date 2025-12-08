import { ChevronDownIcon } from "lucide-react"
import { Button } from "./ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { format } from "date-fns"
import { Calendar } from "./ui/calendar"
import React from "react"

type DatePickerProps = {
    value?: Date | undefined
    onChange?: (d?: Date) => void
}

export default function DatePicker({ value, onChange }: DatePickerProps) {
    const [open, setOpen] = React.useState(false)

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
                        disabled={(date) => date > new Date()}
                        captionLayout="dropdown"
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}