"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, FileText, Download, Loader2, RefreshCw, Trash2 } from "lucide-react"
import { FiX } from "react-icons/fi"
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
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import reportApi, { District, Camera, Report } from "@/lib/api/reportApi"

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCameraSelect?: (cameraId: string) => void
}

export default function ReportDialog({ open, onOpenChange, onCameraSelect }: ReportDialogProps) {
  const [activeTab, setActiveTab] = React.useState("export")
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false)
  
  // Export Tab State
  const [date, setDate] = React.useState<{ from: Date; to: Date } | undefined>()
  const [startTime, setStartTime] = React.useState("00:00")
  const [endTime, setEndTime] = React.useState("23:59")
  const [interval, setInterval] = React.useState("15")
  const [districts, setDistricts] = React.useState<District[]>([])
  const [selectedDistrict, setSelectedDistrict] = React.useState<string>("")
  const [cameras, setCameras] = React.useState<Camera[]>([])
  const [selectedCameras, setSelectedCameras] = React.useState<string[]>([])
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isLoadingDistricts, setIsLoadingDistricts] = React.useState(false)
  const [isLoadingCameras, setIsLoadingCameras] = React.useState(false)

  // List Tab State
  const [reports, setReports] = React.useState<Report[]>([])
  const [isLoadingReports, setIsLoadingReports] = React.useState(false)

  // Fetch Districts on mount
  React.useEffect(() => {
    if (open) {
        const fetchDistricts = async () => {
            setIsLoadingDistricts(true)
            try {
                const data = await reportApi.getDistricts()
                setDistricts(data)
            } catch (error) {
                console.error("Failed to fetch districts:", error)
            } finally {
                setIsLoadingDistricts(false)
            }
        }
        fetchDistricts()
    }
  }, [open])

  // Fetch Cameras when district changes
  React.useEffect(() => {
    if (selectedDistrict) {
        const fetchCameras = async () => {
            setIsLoadingCameras(true)
            try {
                const data = await reportApi.getCamerasByDistrict(selectedDistrict)
                setCameras(data)
                setSelectedCameras([]) // Reset selection
            } catch (error) {
                console.error("Failed to fetch cameras:", error)
            } finally {
                setIsLoadingCameras(false)
            }
        }
        fetchCameras()
    } else {
        setCameras([])
        setSelectedCameras([])
    }
  }, [selectedDistrict])

  // Fetch Reports when tab changes to 'list'
  React.useEffect(() => {
    if (activeTab === "list" && open) {
        fetchReports()
    }
  }, [activeTab, open])

  const fetchReports = async () => {
    setIsLoadingReports(true)
    try {
        const data = await reportApi.getReports()
        setReports(data)
    } catch (error) {
        console.error("Failed to fetch reports:", error)
    } finally {
        setIsLoadingReports(false)
    }
  }

  const handleDelete = async (reportId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa báo cáo này không?")) {
        try {
            await reportApi.deleteReport(reportId);
            fetchReports(); // Refresh list
        } catch (error) {
            console.error("Failed to delete report:", error);
        }
    }
  }

  const handleGenerate = async () => {
    if (!date?.from || !date?.to) {
        alert("Vui lòng chọn khoảng thời gian")
        return
    }

    if (!selectedDistrict) {
        alert("Vui lòng chọn Quận/Huyện")
        return
    }

    // Combine date and time
    const startDateTime = new Date(date.from)
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    startDateTime.setHours(startHours, startMinutes, 0)

    const endDateTime = new Date(date.to)
    const [endHours, endMinutes] = endTime.split(':').map(Number)
    endDateTime.setHours(endHours, endMinutes, 0)

    setIsGenerating(true)
    try {
        await reportApi.generateReport({
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            interval,
            districtId: selectedDistrict,
            cameraIds: selectedCameras
        })
        alert("Báo cáo đang được tạo. Vui lòng kiểm tra tab 'Danh sách báo cáo' sau ít phút.")
        // Switch to list tab to show progress/result if applicable
        setActiveTab("list")
        fetchReports()
    } catch (error) {
        console.error("Failed to generate report:", error)
        alert("Có lỗi xảy ra khi tạo báo cáo.")
    } finally {
        setIsGenerating(false)
    }
  }

  const handleDownload = async (report: Report) => {
      try {
          await reportApi.downloadReport(report.id, report.fileName)
      } catch (error) {
          console.error("Download failed:", error)
          alert("Không thể tải xuống báo cáo.")
      }
  }

  const safeReports = Array.isArray(reports) ? reports : [];
  const pendingReports = safeReports.filter(r => r.status === 'PENDING');
  const completedReports = safeReports.filter(r => r.status === 'COMPLETED');
  const failedReports = safeReports.filter(r => r.status === 'FAILED');

  const getStatusInfo = (status: string) => {
      switch (status) {
          case 'COMPLETED':
              return { label: 'Đã có', color: 'text-green-600 bg-green-50 border-green-100' };
          case 'PENDING':
              return { label: 'Đang tiến hành', color: 'text-yellow-600 bg-yellow-50 border-yellow-100' };
          case 'FAILED':
              return { label: 'Thất bại', color: 'text-red-600 bg-red-50 border-red-100' };
          default:
              return { label: status, color: 'text-gray-600 bg-gray-50 border-gray-100' };
      }
  };

  return (
    <div className="fixed inset-0 flex justify-end z-40 pointer-events-none">
        <div
            className={`pointer-events-auto m-4 pb-3 h-[calc(100vh-2rem)] w-[500px] bg-white rounded-xl shadow-lg border border-gray-200 transform transition-transform duration-100 flex flex-col overflow-hidden ${open ? "translate-x-0" : "translate-x-[110%]"}`}
            role="dialog" aria-modal="true"
        >
            <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200 relative flex-none bg-white">
                <div>
                    <h1 className="text-black text-[22px] font-bold">Báo Cáo Giao Thông</h1>
                    <p className="text-gray-500 text-sm">Quản lý và xuất báo cáo thống kê.</p>
                </div>
                <button
                    onClick={() => onOpenChange(false)}
                    className="text-gray-500 hover:text-black cursor-pointer p-1 rounded-md transition-colors"
                    aria-label="Đóng"
                >
                    <FiX size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <div className="px-6 pt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="export">Xuất Báo Cáo</TabsTrigger>
                            <TabsTrigger value="list">Danh sách báo cáo</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="export" className="flex-1 overflow-y-auto p-6 space-y-6 data-[state=inactive]:hidden">
                        {/* Date Range Picker */}
                        <div className="grid gap-2">
                            <Label>Khoảng thời gian</Label>

                            <div className="flex gap-2">
                                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
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
                                        <div className="p-3 border-b border-border">
                                            <Calendar
                                                initialFocus
                                                mode="range"
                                                defaultMonth={date?.from}
                                                selected={date}
                                                onSelect={(range: any) => setDate(range)}
                                                numberOfMonths={2}
                                            />
                                        </div>
                                        <div className="p-3 flex justify-end">
                                            <Button size="sm" className="h-8" onClick={() => setIsCalendarOpen(false)}>Xong</Button>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Time Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>Giờ bắt đầu</Label>
                                <input 
                                    type="time" 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Giờ kết thúc</Label>
                                <input 
                                    type="time" 
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
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

                        {/* Scope Selection */}
                        <div className="grid gap-2">
                            <Label>Phạm vi báo cáo</Label>
                            <div className="border rounded-md p-4 space-y-4 bg-slate-50/50">
                                
                                {/* 1. Chọn Quận/Huyện */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-gray-700">Chọn Quận / Huyện</Label>
                                    <Select value={selectedDistrict} onValueChange={setSelectedDistrict} disabled={isLoadingDistricts}>
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder={isLoadingDistricts ? "Đang tải..." : "-- Chọn khu vực --"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {districts.map((d) => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                </div>

                                {/* 2. Chọn Camera */}
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-gray-700">
                                    Danh sách Camera {selectedDistrict ? `(${cameras.length})` : ''}
                                    </Label>
                                    
                                    {!selectedDistrict ? (
                                    <div className="h-[120px] border rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400 italic">
                                        Vui lòng chọn Quận/Huyện trước
                                    </div>
                                    ) : isLoadingCameras ? (
                                        <div className="h-[120px] border rounded bg-white flex items-center justify-center">
                                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                        </div>
                                    ) : (
                                    <ScrollArea className="h-[120px] border rounded p-2 bg-white">
                                        {cameras.length > 0 ? (
                                            cameras.map((cam) => (
                                                <div key={cam.id} className="flex items-center space-x-2 mb-2 hover:bg-slate-50 p-1 rounded transition-colors">
                                                    <Checkbox 
                                                        id={cam.id} 
                                                        checked={selectedCameras.includes(cam.id)}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                setSelectedCameras([...selectedCameras, cam.id])
                                                                // Highlight the camera on map when selected
                                                                if (onCameraSelect) {
                                                                    onCameraSelect(cam.id)
                                                                }
                                                            } else {
                                                                setSelectedCameras(selectedCameras.filter(id => id !== cam.id))
                                                            }
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={cam.id}
                                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                                        onClick={() => {
                                                            // Also highlight when clicking the label
                                                            if (onCameraSelect) {
                                                                onCameraSelect(cam.id)
                                                            }
                                                        }}
                                                    >
                                                        {cam.name}
                                                    </label>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-xs text-gray-500 p-2 text-center">Không có camera nào trong khu vực này</div>
                                        )}
                                    </ScrollArea>
                                    )}
                                    
                                    {/* Quick Select All Helper */}
                                    {selectedDistrict && cameras.length > 0 && (
                                    <div className="flex justify-end">
                                        <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 text-[10px] text-blue-600 hover:text-blue-800 px-2"
                                        onClick={() => {
                                            const allIds = cameras.map(c => c.id);
                                            if (selectedCameras.length === allIds.length) {
                                            setSelectedCameras([]);
                                            } else {
                                            setSelectedCameras(allIds);
                                            }
                                        }}
                                        >
                                        {selectedCameras.length === cameras.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                                        </Button>
                                    </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end gap-2">
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
                        </div>
                    </TabsContent>

                    <TabsContent value="list" className="flex-1 overflow-y-auto p-6 space-y-6 data-[state=inactive]:hidden">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-sm font-semibold text-gray-700">Danh sách báo cáo đã tạo</h3>
                            <Button variant="ghost" size="sm" onClick={fetchReports} disabled={isLoadingReports}>
                                <RefreshCw className={`h-4 w-4 ${isLoadingReports ? 'animate-spin' : ''}`} />
                            </Button>
                        </div>

                        {isLoadingReports ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Pending Section */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-yellow-600 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                        Đang tiến hành ({pendingReports.length})
                                    </h4>
                                    {pendingReports.length > 0 ? (
                                        <div className="space-y-2 pl-2 border-l-2 border-yellow-100">
                                            {pendingReports.map(report => (
                                                <ReportItem 
                                                    key={report.id} 
                                                    report={report} 
                                                    statusInfo={getStatusInfo(report.status)}
                                                    onDownload={handleDownload}
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic pl-4">Không có báo cáo nào đang xử lý.</p>
                                    )}
                                </div>

                                {/* Completed Section */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Đã có ({completedReports.length})
                                    </h4>
                                    {completedReports.length > 0 ? (
                                        <div className="space-y-2 pl-2 border-l-2 border-green-100">
                                            {completedReports.map(report => (
                                                <ReportItem 
                                                    key={report.id} 
                                                    report={report} 
                                                    statusInfo={getStatusInfo(report.status)}
                                                    onDownload={handleDownload}
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic pl-4">Chưa có báo cáo nào hoàn thành.</p>
                                    )}
                                </div>

                                {/* Failed Section */}
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                        Thất bại ({failedReports.length})
                                    </h4>
                                    {failedReports.length > 0 ? (
                                        <div className="space-y-2 pl-2 border-l-2 border-red-100">
                                            {failedReports.map(report => (
                                                <ReportItem 
                                                    key={report.id} 
                                                    report={report} 
                                                    statusInfo={getStatusInfo(report.status)}
                                                    onDownload={handleDownload}
                                                    onDelete={handleDelete}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 italic pl-4">Không có báo cáo lỗi.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    </div>
  )
}

function ReportItem({ 
    report, 
    statusInfo, 
    onDownload, 
    onDelete 
}: { 
    report: Report, 
    statusInfo: { label: string, color: string }, 
    onDownload: (r: Report) => void, 
    onDelete: (id: string) => void 
}) {
    return (
        <div className="flex items-center justify-between p-2 border rounded-lg bg-white hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`h-8 w-8 rounded flex items-center justify-center flex-none ${
                    report.status === 'FAILED' ? 'bg-red-50' : 
                    report.status === 'PENDING' ? 'bg-yellow-50' : 'bg-blue-50'
                }`}>
                    <FileText className={`h-4 w-4 ${
                        report.status === 'FAILED' ? 'text-red-600' : 
                        report.status === 'PENDING' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{report.fileName}</p>
                    <p className="text-xs text-gray-500">{format(new Date(report.createdAt), "dd/MM/yyyy HH:mm")}</p>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDownload(report)}
                    disabled={report.status !== 'COMPLETED'}
                    title={report.status === 'COMPLETED' ? "Tải xuống" : "Chưa sẵn sàng"}
                    className="h-8 w-8"
                >
                    <Download className={`h-4 w-4 ${report.status !== 'COMPLETED' ? 'text-gray-300' : 'text-gray-600'}`} />
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => onDelete(report.id)}
                    title="Xóa báo cáo"
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
