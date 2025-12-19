"use client"

import * as React from "react"
import { format } from "date-fns"
import { FileText, Download, Loader2, RefreshCw, Trash2, Eye, Calendar as CalendarIcon } from "lucide-react"
import { FiX } from "react-icons/fi"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import DatePicker from "@/components/date-picker"

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCameraSelect?: (cameraId: string) => void
}

export default function ReportDialog({ open, onOpenChange, onCameraSelect }: ReportDialogProps) {
  const [activeTab, setActiveTab] = React.useState("export")
  
  // Export Tab State
  const [startDate, setStartDate] = React.useState<Date | undefined>(new Date())
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date())
  const [startTime, setStartTime] = React.useState("00:00")
  const [endTime, setEndTime] = React.useState("23:59")
  const [interval, setInterval] = React.useState("15")
  const [reportName, setReportName] = React.useState("")
  
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
  const [selectedReport, setSelectedReport] = React.useState<Report | null>(null)

  // Update report name when start date changes
  React.useEffect(() => {
    if (startDate) {
        setReportName(`Báo cáo giao thông ${format(startDate, 'dd/MM/yyyy')}`)
    }
  }, [startDate])

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
    if (selectedDistrict && selectedDistrict !== "ALL") {
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
            if (selectedReport?.id === reportId) {
                setSelectedReport(null);
            }
            fetchReports(); // Refresh list
        } catch (error) {
            console.error("Failed to delete report:", error);
        }
    }
  }

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
        alert("Vui lòng chọn khoảng thời gian")
        return
    }

    if (!selectedDistrict) {
        alert("Vui lòng chọn Quận/Huyện hoặc Toàn thành phố")
        return
    }

    // Combine date and time
    const startDateTime = new Date(startDate)
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    startDateTime.setHours(startHours, startMinutes, 0)

    const endDateTime = new Date(endDate)
    const [endHours, endMinutes] = endTime.split(':').map(Number)
    endDateTime.setHours(endHours, endMinutes, 0)

    setIsGenerating(true)
    try {
        await reportApi.generateReport({
            name: reportName,
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            interval,
            districtId: selectedDistrict === "ALL" ? undefined : selectedDistrict,
            cameraIds: selectedDistrict === "ALL" ? [] : selectedCameras
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog" aria-modal="true"
        >
            <div className="flex items-center justify-between py-4 px-6 border-b border-gray-200 relative flex-none bg-white">
                <div>
                    <h1 className="text-black text-2xl font-bold">Báo Cáo Giao Thông</h1>
                    <p className="text-gray-500 text-sm">Quản lý và xuất báo cáo thống kê.</p>
                </div>
                <button
                    onClick={() => onOpenChange(false)}
                    className="text-gray-500 hover:text-black cursor-pointer p-2 rounded-md transition-colors hover:bg-gray-100"
                    aria-label="Đóng"
                >
                    <FiX size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <div className="px-6 pt-4 border-b">
                        <TabsList className="grid w-[400px] grid-cols-2">
                            <TabsTrigger value="export">Xuất Báo Cáo</TabsTrigger>
                            <TabsTrigger value="list">Danh sách báo cáo</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="export" className="flex-1 overflow-y-auto p-6 data-[state=inactive]:hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
                            {/* Left Column: Settings */}
                            <div className="lg:col-span-5 space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Cấu hình báo cáo</h3>
                                    
                                    <div className="grid gap-2">
                                        <Label>Tên báo cáo</Label>
                                        <input 
                                            type="text"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={reportName}
                                            onChange={(e) => setReportName(e.target.value)}
                                            placeholder="Nhập tên báo cáo"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Ngày bắt đầu</Label>
                                            <DatePicker value={startDate} onChange={setStartDate} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Ngày kết thúc</Label>
                                            <DatePicker value={endDate} onChange={setEndDate} />
                                        </div>
                                    </div>

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
                                </div>
                            </div>

                            {/* Right Column: Scope */}
                            <div className="lg:col-span-7 space-y-6 flex flex-col">
                                <h3 className="text-lg font-semibold text-gray-900">Phạm vi dữ liệu</h3>
                                <div className="border rounded-lg p-6 space-y-6 bg-slate-50/50 flex-1 flex flex-col">
                                    
                                    {/* 1. Chọn Quận/Huyện */}
                                    <div className="space-y-2">
                                        <Label className="text-sm font-semibold text-gray-700">Chọn Quận / Huyện</Label>
                                        <Select value={selectedDistrict} onValueChange={setSelectedDistrict} disabled={isLoadingDistricts}>
                                        <SelectTrigger className="bg-white h-12">
                                            <SelectValue placeholder={isLoadingDistricts ? "Đang tải..." : "-- Chọn khu vực --"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL" className="font-semibold text-blue-600">Toàn thành phố</SelectItem>
                                            {districts.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                    </div>

                                    {/* 2. Chọn Camera */}
                                    {selectedDistrict !== "ALL" && (
                                        <div className="space-y-2 flex-1 flex flex-col">
                                            <Label className="text-sm font-semibold text-gray-700">
                                            Danh sách Camera {selectedDistrict ? `(${cameras.length})` : ''}
                                            </Label>
                                            
                                            {!selectedDistrict ? (
                                            <div className="flex-1 border rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-400 italic min-h-[200px]">
                                                Vui lòng chọn Quận/Huyện trước
                                            </div>
                                            ) : isLoadingCameras ? (
                                                <div className="flex-1 border rounded-lg bg-white flex items-center justify-center min-h-[200px]">
                                                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                                </div>
                                            ) : (
                                            <ScrollArea className="flex-1 border rounded-lg p-4 bg-white min-h-[200px]">
                                                {cameras.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {cameras.map((cam) => (
                                                            <div key={cam.id} className="flex items-center space-x-3 hover:bg-slate-50 p-2 rounded-md transition-colors border border-transparent hover:border-slate-200">
                                                                <Checkbox 
                                                                    id={cam.id} 
                                                                    checked={selectedCameras.includes(cam.id)}
                                                                    onCheckedChange={(checked) => {
                                                                        if (checked) {
                                                                            setSelectedCameras([...selectedCameras, cam.id])
                                                                            if (onCameraSelect) onCameraSelect(cam.id)
                                                                        } else {
                                                                            setSelectedCameras(selectedCameras.filter(id => id !== cam.id))
                                                                        }
                                                                    }}
                                                                />
                                                                <label
                                                                    htmlFor={cam.id}
                                                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                                                    onClick={() => {
                                                                        if (onCameraSelect) onCameraSelect(cam.id)
                                                                    }}
                                                                >
                                                                    {cam.name}
                                                                </label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-gray-500 p-4 text-center">Không có camera nào trong khu vực này</div>
                                                )}
                                            </ScrollArea>
                                            )}
                                            
                                            {/* Quick Select All Helper */}
                                            {selectedDistrict && cameras.length > 0 && (
                                            <div className="flex justify-end pt-2">
                                                <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-blue-600 hover:text-blue-800"
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
                                    )}
                                    
                                    {selectedDistrict === "ALL" && (
                                        <div className="flex-1 border rounded-lg bg-blue-50 flex flex-col items-center justify-center text-blue-600 p-8 text-center min-h-[200px]">
                                            <FileText className="h-12 w-12 mb-4 opacity-50" />
                                            <p className="font-medium">Đã chọn chế độ báo cáo toàn thành phố</p>
                                            <p className="text-sm opacity-75 mt-2">Hệ thống sẽ tổng hợp dữ liệu từ tất cả các camera trên địa bàn.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex justify-end gap-4 border-t mt-6">
                            <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>Hủy</Button>
                            <Button size="lg" onClick={handleGenerate} disabled={isGenerating || (!selectedDistrict) || (selectedDistrict !== "ALL" && selectedCameras.length === 0)}>
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-5 w-5" />
                                        Xuất Báo Cáo
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="list" className="flex-1 overflow-hidden p-6 data-[state=inactive]:hidden">
                        <div className="grid grid-cols-12 gap-6 h-full">
                            {/* List Column */}
                            <div className="col-span-4 flex flex-col h-full border rounded-lg bg-white overflow-hidden">
                                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                                    <h3 className="font-semibold text-gray-700">Danh sách báo cáo</h3>
                                    <Button variant="ghost" size="sm" onClick={fetchReports} disabled={isLoadingReports}>
                                        <RefreshCw className={`h-4 w-4 ${isLoadingReports ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                                <ScrollArea className="flex-1 p-4">
                                    <div className="space-y-4">
                                        {/* Pending */}
                                        {pendingReports.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-yellow-600 uppercase tracking-wider">Đang xử lý</h4>
                                                {pendingReports.map(report => (
                                                    <ReportItem 
                                                        key={report.id} 
                                                        report={report} 
                                                        isActive={selectedReport?.id === report.id}
                                                        onClick={() => setSelectedReport(report)}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Completed */}
                                        {completedReports.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider">Hoàn thành</h4>
                                                {completedReports.map(report => (
                                                    <ReportItem 
                                                        key={report.id} 
                                                        report={report} 
                                                        isActive={selectedReport?.id === report.id}
                                                        onClick={() => setSelectedReport(report)}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {/* Failed */}
                                        {failedReports.length > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider">Thất bại</h4>
                                                {failedReports.map(report => (
                                                    <ReportItem 
                                                        key={report.id} 
                                                        report={report} 
                                                        isActive={selectedReport?.id === report.id}
                                                        onClick={() => setSelectedReport(report)}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {safeReports.length === 0 && !isLoadingReports && (
                                            <div className="text-center py-8 text-gray-400">
                                                <p>Chưa có báo cáo nào.</p>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Preview Column */}
                            <div className="col-span-8 flex flex-col h-full border rounded-lg bg-gray-50 overflow-hidden">
                                {selectedReport ? (
                                    <div className="flex flex-col h-full">
                                        <div className="p-4 border-b bg-white flex justify-between items-center shadow-sm">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-900">{selectedReport.fileName}</h3>
                                                <p className="text-sm text-gray-500">
                                                    Tạo lúc: {format(new Date(selectedReport.createdAt), "HH:mm dd/MM/yyyy")}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="destructive" 
                                                    size="sm"
                                                    onClick={() => handleDelete(selectedReport.id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Xóa
                                                </Button>
                                                <Button 
                                                    variant="default" 
                                                    size="sm"
                                                    onClick={() => handleDownload(selectedReport)}
                                                    disabled={selectedReport.status !== 'COMPLETED'}
                                                >
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Tải xuống
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex-1 p-8 flex items-center justify-center overflow-hidden">
                                            {selectedReport.status === 'COMPLETED' ? (
                                                <div className="text-center space-y-4 max-w-md">
                                                    <div className="bg-white p-8 rounded-full shadow-lg inline-block mb-4">
                                                        <FileText className="h-16 w-16 text-blue-500" />
                                                    </div>
                                                    <h4 className="text-xl font-semibold text-gray-900">Báo cáo đã sẵn sàng</h4>
                                                    <p className="text-gray-500">
                                                        Bạn có thể xem trước thông tin tóm tắt hoặc tải xuống file PDF đầy đủ để xem chi tiết.
                                                    </p>
                                                    {/* Future: If we have a preview URL or HTML content, render it here */}
                                                </div>
                                            ) : selectedReport.status === 'PENDING' ? (
                                                <div className="text-center space-y-4">
                                                    <Loader2 className="h-16 w-16 animate-spin text-yellow-500 mx-auto" />
                                                    <h4 className="text-xl font-semibold text-gray-900">Đang xử lý báo cáo...</h4>
                                                    <p className="text-gray-500">Vui lòng đợi trong giây lát.</p>
                                                </div>
                                            ) : (
                                                <div className="text-center space-y-4">
                                                    <div className="bg-red-100 p-6 rounded-full inline-block">
                                                        <FiX className="h-12 w-12 text-red-500" />
                                                    </div>
                                                    <h4 className="text-xl font-semibold text-gray-900">Tạo báo cáo thất bại</h4>
                                                    <p className="text-gray-500">Đã có lỗi xảy ra trong quá trình tạo báo cáo.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                                        <FileText className="h-16 w-16 mb-4 opacity-20" />
                                        <p>Chọn một báo cáo để xem chi tiết</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    </div>
  )
}

function ReportItem({ 
    report, 
    isActive,
    onClick
}: { 
    report: Report, 
    isActive: boolean,
    onClick: () => void
}) {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "flex items-center p-3 border rounded-lg cursor-pointer transition-all",
                isActive ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500" : "bg-white hover:border-blue-300 hover:shadow-sm"
            )}
        >
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-none mr-3 ${
                report.status === 'FAILED' ? 'bg-red-100 text-red-600' : 
                report.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
            }`}>
                <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium truncate", isActive ? "text-blue-700" : "text-gray-900")}>
                    {report.fileName}
                </p>
                <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">{format(new Date(report.createdAt), "dd/MM/yyyy")}</p>
                    <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        report.status === 'COMPLETED' ? "bg-green-100 text-green-700" :
                        report.status === 'PENDING' ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                    )}>
                        {report.status === 'COMPLETED' ? 'Sẵn sàng' : report.status === 'PENDING' ? 'Đang xử lý' : 'Lỗi'}
                    </span>
                </div>
            </div>
        </div>
    )
}
