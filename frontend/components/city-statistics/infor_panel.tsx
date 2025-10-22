"use client"

import { ResponsiveContainer } from "recharts"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
    children: React.ReactNode
}

export default function InforPanel({ title, children }: InforPanelProps) {
    return (
        <div className="bg-white rounded-lg px-6 py-3 w-full max-w-4xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">
                    {title}
                </h2>
                <Calendar22 />
            </div>
            <ResponsiveContainer width="100%" height={300}>
                {children}
            </ResponsiveContainer>
        </div>
    )
}

function Calendar22() {
    const [open, setOpen] = React.useState(false)
    const [date, setDate] = React.useState<Date | undefined>(undefined)

    return (
        <div className="flex flex-col gap-3">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        id="date"
                        className="w-48 justify-between font-normal cursor-pointer"
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