"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, FileText, Download, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"

// Mock data for districts and cameras (replace with API data later)
const districts = [
  { id: "quan-1", label: "Quận 1" },
  { id: "quan-3", label: "Quận 3" },
  { id: "quan-binh-thanh", label: "Quận Bình Thạnh" },
  { id: "tp-thu-duc", label: "TP. Thủ Đức" },
]

// Mock cameras mapping by district
const camerasByDistrict: Record<string, { id: string; label: string }[]> = {
  "quan-1": [
    { id: "cam-01", label: "CAM-01: Ngã tư Hàng Xanh" }, // Just mock data, Hàng Xanh is BThanh actually but for demo
    { id: "cam-03", label: "CAM-03: Phố đi bộ Nguyễn Huệ" },
    { id: "cam-04", label: "CAM-04: Chợ Bến Thành" },
  ],
  "quan-3": [
    { id: "cam-05", label: "CAM-05: Hồ Con Rùa" },
  ],
  "quan-binh-thanh": [
    { id: "cam-02", label: "CAM-02: Cầu Sài Gòn" },
  ],
  "tp-thu-duc": []
}

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ReportDialog({ open, onOpenChange }: ReportDialogProps) {
  const [date, setDate] = React.useState<{ from: Date; to: Date } | undefined>()
  const [interval, setInterval] = React.useState("15")
  const [selectedDistrict, setSelectedDistrict] = React.useState<string>("")
  const [selectedCameras, setSelectedCameras] = React.useState<string[]>([])
  const [isGenerating, setIsGenerating] = React.useState(false)

  // Reset selected cameras when district changes
  React.useEffect(() => {
    setSelectedCameras([])
  }, [selectedDistrict])

  const handleGenerate = async () => {
    setIsGenerating(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsGenerating(false)
    // In real app, handle success/download here
    alert("Yêu cầu tạo báo cáo đã được gửi!")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Xuất Báo Cáo Giao Thông</DialogTitle>
          <DialogDescription>
            Chọn khoảng thời gian và phạm vi để tạo báo cáo chi tiết.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Date Range Picker */}
          <div className="grid gap-2">
            <Label>Khoảng thời gian</Label>
            <div className="flex gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !date?.from && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                        date.to ? (
                            <>
                            {format(date.from, "dd/MM/yyyy")} -{" "}
                            {format(date.to, "dd/MM/yyyy")}
                            </>
                        ) : (
                            format(date.from, "dd/MM/yyyy")
                        )
                        ) : (
                        <span>Chọn ngày bắt đầu - kết thúc</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(range: any) => setDate(range)}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
            </div>
          </div>

          {/* Interval Selection */}
          <div className="grid gap-2">
            <Label>Độ phân giải thời gian (Interval)</Label>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn khoảng thời gian" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 phút</SelectItem>
                <SelectItem value="15">15 phút</SelectItem>
                <SelectItem value="30">30 phút</SelectItem>
                <SelectItem value="60">1 giờ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scope Selection - Updated Logic */}
          <div className="grid gap-2">
            <Label>Phạm vi báo cáo</Label>
            <div className="border rounded-md p-4 space-y-4 bg-slate-50/50">
                
                {/* 1. Chọn Quận/Huyện (Single Select) */}
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">Chọn Quận / Huyện</Label>
                    <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="-- Chọn khu vực --" />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((d) => (
                          <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>

                {/* 2. Chọn Camera (Multi Select based on District) */}
                <div className="space-y-2">
                    <Label className="text-xs font-semibold text-gray-700">
                      Danh sách Camera {selectedDistrict ? `(${camerasByDistrict[selectedDistrict]?.length || 0})` : ''}
                    </Label>
                    
                    {!selectedDistrict ? (
                      <div className="h-[120px] border rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400 italic">
                        Vui lòng chọn Quận/Huyện trước
                      </div>
                    ) : (
                      <ScrollArea className="h-[120px] border rounded p-2 bg-white">
                          {camerasByDistrict[selectedDistrict]?.length > 0 ? (
                            camerasByDistrict[selectedDistrict].map((cam) => (
                                <div key={cam.id} className="flex items-center space-x-2 mb-2 hover:bg-slate-50 p-1 rounded transition-colors">
                                    <Checkbox 
                                        id={cam.id} 
                                        checked={selectedCameras.includes(cam.id)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedCameras([...selectedCameras, cam.id])
                                            } else {
                                                setSelectedCameras(selectedCameras.filter(id => id !== cam.id))
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor={cam.id}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                    >
                                        {cam.label}
                                    </label>
                                </div>
                            ))
                          ) : (
                            <div className="text-xs text-gray-500 p-2 text-center">Không có camera nào trong khu vực này</div>
                          )}
                      </ScrollArea>
                    )}
                    
                    {/* Quick Select All Helper */}
                    {selectedDistrict && camerasByDistrict[selectedDistrict]?.length > 0 && (
                      <div className="flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[10px] text-blue-600 hover:text-blue-800 px-2"
                          onClick={() => {
                            const allIds = camerasByDistrict[selectedDistrict].map(c => c.id);
                            if (selectedCameras.length === allIds.length) {
                              setSelectedCameras([]);
                            } else {
                              setSelectedCameras(allIds);
                            }
                          }}
                        >
                          {selectedCameras.length === camerasByDistrict[selectedDistrict].length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                        </Button>
                      </div>
                    )}
                </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleGenerate} disabled={isGenerating || selectedCameras.length === 0}>
            {isGenerating ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang xử lý...
                </>
            ) : (
                <>
                    <Download className="mr-2 h-4 w-4" />
                    Xuất Báo Cáo
                </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
