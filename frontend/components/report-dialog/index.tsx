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
import reportApi, { District, Camera, Report, ReportDetail } from "@/lib/api/reportApi"
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
  const [selectedDistricts, setSelectedDistricts] = React.useState<string[]>([])
  const [cameras, setCameras] = React.useState<Camera[]>([])
  const [selectedCameras, setSelectedCameras] = React.useState<string[]>([])
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isLoadingDistricts, setIsLoadingDistricts] = React.useState(false)
  const [isLoadingCameras, setIsLoadingCameras] = React.useState(false)
  
  // Scheduling State
  const [isScheduled, setIsScheduled] = React.useState(false)
  const [scheduledDate, setScheduledDate] = React.useState<Date | undefined>(new Date())
  const [scheduledTimeStr, setScheduledTimeStr] = React.useState("00:00")

  // List Tab State
  const [reports, setReports] = React.useState<Report[]>([])
  const [isLoadingReports, setIsLoadingReports] = React.useState(false)
  const [selectedReport, setSelectedReport] = React.useState<ReportDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false)
  
  // Success Popup State
  const [showSuccessPopup, setShowSuccessPopup] = React.useState(false)
  const [successMessage, setSuccessMessage] = React.useState("")

  const handleViewReport = async (report: Report) => {
    // Initialize with basic info and empty details
    const tempDetail: ReportDetail = {
        ...report,
        startTime: "",
        endTime: "",
        interval: 0,
        districts: [],
        cameras: []
    }
    setSelectedReport(tempDetail)
    setIsLoadingDetail(true)
    
    try {
        const detail = await reportApi.getReportDetail(report.id)
        setSelectedReport(detail)
    } catch (error) {
        console.error("Failed to fetch report details:", error)
    } finally {
        setIsLoadingDetail(false)
    }
  }

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

  // Fetch Cameras when districts change
  React.useEffect(() => {
    if (selectedDistricts.length > 0) {
        const fetchCameras = async () => {
            setIsLoadingCameras(true)
            try {
                // Fetch cameras for all selected districts
                const promises = selectedDistricts.map(dId => reportApi.getCamerasByDistrict(dId))
                const results = await Promise.all(promises)
                const allCameras = results.flat()
                
                // Remove duplicates if any
                const uniqueCameras = Array.from(new Map(allCameras.map(c => [c.id, c])).values())
                
                setCameras(uniqueCameras)
                // Filter selected cameras to only keep those in the new list
                setSelectedCameras(prev => prev.filter(id => uniqueCameras.some(c => c.id === id)))
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
  }, [selectedDistricts])

  // Fetch Reports when tab changes to 'list'
  React.useEffect(() => {
    if (activeTab === "list" && open) {
        fetchReports()
    }
  }, [activeTab, open])

  // Fetch Report Detail when selected
  React.useEffect(() => {
    if (selectedReport && !selectedReport.districts) { // If details missing
        const fetchDetail = async () => {
            setIsLoadingDetail(true)
            try {
                const detail = await reportApi.getReportDetail(selectedReport.id)
                setSelectedReport(detail)
            } catch (error) {
                console.error("Failed to fetch report detail:", error)
            } finally {
                setIsLoadingDetail(false)
            }
        }
        fetchDetail()
    }
  }, [selectedReport?.id])

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

    if (selectedDistricts.length === 0) {
        alert("Vui lòng chọn ít nhất một Quận/Huyện")
        return
    }

    // Combine date and time
    const startDateTime = new Date(startDate)
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    startDateTime.setHours(startHours, startMinutes, 0)

    const endDateTime = new Date(endDate)
    const [endHours, endMinutes] = endTime.split(':').map(Number)
    endDateTime.setHours(endHours, endMinutes, 0)

    // Calculate scheduled time
    let scheduledTimeIso: string | undefined = undefined
    if (isScheduled && scheduledDate) {
        const schedDateTime = new Date(scheduledDate)
        const [schedHours, schedMinutes] = scheduledTimeStr.split(':').map(Number)
        schedDateTime.setHours(schedHours, schedMinutes, 0)
        scheduledTimeIso = schedDateTime.toISOString()
    }

    setIsGenerating(true)
    try {
        await reportApi.generateReport({
            name: reportName,
            startDate: startDateTime.toISOString(),
            endDate: endDateTime.toISOString(),
            interval,
            districtIds: selectedDistricts,
            cameraIds: selectedCameras,
            scheduledTime: scheduledTimeIso
        })
        // Show success popup instead of alert
        setSuccessMessage(isScheduled 
            ? "Báo cáo đã được lên lịch thành công!" 
            : "Báo cáo đang được tạo. Vui lòng kiểm tra danh sách báo cáo sau ít phút."
        )
        setShowSuccessPopup(true)
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

  // Success Popup Component
  const SuccessPopup = () => {
    if (!showSuccessPopup) return null;
    
    return (
      <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800">Thành công!</h3>
            </div>
          </div>
          
          {/* Content */}
          <div className="px-6 py-5">
            <p className="text-gray-600 text-sm leading-relaxed">{successMessage}</p>
          </div>
          
          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Đóng
            </button>
            <button
              onClick={() => {
                setShowSuccessPopup(false)
                setActiveTab("list")
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors shadow-sm"
            >
              Danh sách báo cáo
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <SuccessPopup />
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
        <div
            className="bg-white w-full h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog" aria-modal="true"
        >
            <div className="flex items-center justify-center py-4 px-6 border-b border-gray-200 relative flex-none bg-gradient-to-r from-blue-50 via-white to-purple-50">
                <div className="text-center">
                    <h1 className="text-gray-800 text-2xl font-bold">Báo Cáo Giao Thông</h1>
                    <p className="text-gray-500 text-sm">Quản lý và xuất báo cáo thống kê.</p>
                </div>
            </div>

            <div className="flex-1 overflow-auto flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <div className="px-6 pt-4 pb-2 flex justify-center">
                        <TabsList className="grid w-[320px] grid-cols-2 bg-gray-100 p-1 rounded-lg">
                            <TabsTrigger value="export" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Xuất Báo Cáo</TabsTrigger>
                            <TabsTrigger value="list" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Danh sách</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="export" className="flex-1 overflow-y-auto data-[state=inactive]:hidden p-6 pl-20">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Left Column: Settings + Districts */}
                            <div className="space-y-6">
                                {/* Cấu hình báo cáo */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                        <span className="w-1 h-5 bg-blue-500 rounded-full"></span>
                                        Cấu hình báo cáo
                                    </h3>
                                    
                                    <div className="grid gap-2 max-w-md">
                                        <Label>Tên báo cáo</Label>
                                        <input 
                                            type="text"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={reportName}
                                            onChange={(e) => setReportName(e.target.value)}
                                            placeholder="Nhập tên báo cáo"
                                        />
                                    </div>

                                    <div className="flex flex-wrap gap-3 items-end">
                                        <div className="grid gap-2">
                                            <Label>Ngày bắt đầu</Label>
                                            <DatePicker value={startDate} onChange={setStartDate} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Ngày kết thúc</Label>
                                            <DatePicker value={endDate} onChange={setEndDate} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Giờ bắt đầu</Label>
                                            <input 
                                                type="time" 
                                                className="flex h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                value={startTime}
                                                onChange={(e) => setStartTime(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Giờ kết thúc</Label>
                                            <input 
                                                type="time" 
                                                className="flex h-10 w-28 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                value={endTime}
                                                onChange={(e) => setEndTime(e.target.value)}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Độ phân giải</Label>
                                            <Select value={interval} onValueChange={setInterval}>
                                                <SelectTrigger className="w-28">
                                                    <SelectValue placeholder="Chọn" />
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

                                {/* Quận/Huyện - NO scroll, display full */}
                                <div className="space-y-3">
                                    <Label className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                        <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                                        Chọn Quận / Huyện ({selectedDistricts.length})
                                    </Label>
                                    <div className="border rounded-lg p-4 bg-gradient-to-br from-slate-50 to-white">
                                        {isLoadingDistricts ? (
                                            <div className="flex items-center justify-center py-8">
                                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 gap-2">
                                                {districts.map((d) => (
                                                    <div key={d.id} className="flex items-center space-x-2 hover:bg-white p-2 rounded-md transition-colors border border-transparent hover:border-slate-200">
                                                        <Checkbox 
                                                            id={`district-${d.id}`}
                                                            checked={selectedDistricts.includes(d.id)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedDistricts([...selectedDistricts, d.id])
                                                                } else {
                                                                    setSelectedDistricts(selectedDistricts.filter(id => id !== d.id))
                                                                }
                                                            }}
                                                        />
                                                        <label
                                                            htmlFor={`district-${d.id}`}
                                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                                        >
                                                            {d.name}
                                                        </label>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {/* Quick select/deselect all districts */}
                                    {districts.length > 0 && (
                                        <div className="flex justify-end">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-blue-600 hover:text-blue-800"
                                                onClick={async () => {
                                                    if (selectedDistricts.length === districts.length) {
                                                        setSelectedDistricts([]);
                                                        setSelectedCameras([]);
                                                    } else {
                                                        // Select all districts
                                                        const allDistrictIds = districts.map(d => d.id);
                                                        setSelectedDistricts(allDistrictIds);
                                                        
                                                        // Fetch and auto-select all cameras
                                                        setIsLoadingCameras(true);
                                                        try {
                                                            const promises = allDistrictIds.map(dId => reportApi.getCamerasByDistrict(dId));
                                                            const results = await Promise.all(promises);
                                                            const allCameras = results.flat();
                                                            const uniqueCameras = Array.from(new Map(allCameras.map(c => [c.id, c])).values());
                                                            setCameras(uniqueCameras);
                                                            setSelectedCameras(uniqueCameras.map(c => c.id));
                                                        } catch (error) {
                                                            console.error("Failed to fetch cameras:", error);
                                                        } finally {
                                                            setIsLoadingCameras(false);
                                                        }
                                                    }
                                                }}
                                            >
                                                {selectedDistricts.length === districts.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Scheduling Section */}
                                <div className="space-y-4 border-t pt-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox 
                                            id="schedule-report" 
                                            checked={isScheduled}
                                            onCheckedChange={(checked) => setIsScheduled(checked as boolean)}
                                        />
                                        <label
                                            htmlFor="schedule-report"
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            Hẹn giờ thực thi báo cáo
                                        </label>
                                    </div>
                                    
                                    {isScheduled && (
                                        <div className="p-4 bg-slate-50 rounded-lg border animate-in slide-in-from-top-2 space-y-3">
                                            <div className="flex gap-4">
                                                <div className="grid gap-2">
                                                    <Label>Ngày thực thi</Label>
                                                    <DatePicker value={scheduledDate} onChange={setScheduledDate} />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Giờ thực thi</Label>
                                                    <input 
                                                        type="time" 
                                                        className="flex h-10 w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        value={scheduledTimeStr}
                                                        onChange={(e) => setScheduledTimeStr(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                * Báo cáo sẽ được hệ thống tự động tạo vào thời gian đã chọn.
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Column: Camera List - WITH scroll */}
                            <div className="space-y-3">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <span className="w-1 h-5 bg-green-500 rounded-full"></span>
                                    Danh sách Camera {selectedDistricts.length > 0 ? `(${cameras.length})` : ''}
                                </h3>
                                
                                {/* 
                                    === HƯỚNG DẪN CHỈNH KÍCH THƯỚC KHUNG CAMERA ===
                                    - h-[700px]: Chiều cao khung (height). Đổi số này để tăng/giảm chiều cao.
                                      Ví dụ: h-[500px], h-[800px], h-[90vh] (90% chiều cao màn hình)
                                    - Để thay đổi chiều rộng: thêm class như w-full, w-[400px], max-w-lg, etc.
                                */}
                                <div className="border rounded-lg bg-gradient-to-br from-slate-50 to-white h-[700px] overflow-hidden flex flex-col shadow-sm">
                                    {selectedDistricts.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center text-sm text-gray-400 italic">
                                            Vui lòng chọn Quận/Huyện trước
                                        </div>
                                    ) : isLoadingCameras ? (
                                        <div className="flex-1 flex items-center justify-center">
                                            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                                        </div>
                                    ) : cameras.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
                                            Không có camera nào trong khu vực này
                                        </div>
                                    ) : (
                                        <ScrollArea className="flex-1 p-4">
                                            <div className="space-y-4">
                                                {/* Group cameras by district */}
                                                {selectedDistricts.map(districtId => {
                                                    const districtCameras = cameras.filter(c => c.districtId === districtId);
                                                    if (districtCameras.length === 0) return null;
                                                    const districtName = districts.find(d => d.id === districtId)?.name || districtId;
                                                    return (
                                                        <div key={districtId} className="space-y-2">
                                                            {/* District header */}
                                                            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded">
                                                                📍 {districtName} ({districtCameras.length} camera)
                                                            </div>
                                                            {/* Cameras in this district */}
                                                            <div className="grid grid-cols-2 gap-1 pl-2">
                                                                {districtCameras.map((cam) => (
                                                                    <div key={cam.id} className="flex items-center space-x-2 hover:bg-white p-2 rounded-md transition-colors border border-transparent hover:border-slate-200">
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
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </ScrollArea>
                                    )}
                                </div>
                                
                                {/* Quick Select All Cameras */}
                                {selectedDistricts.length > 0 && cameras.length > 0 && (
                                    <div className="flex justify-end">
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
                        </div>

                        {/* Footer buttons - sticky at bottom */}
                        <div className="pt-6 flex justify-end gap-4 border-t mt-8 sticky bottom-0 bg-gradient-to-r from-white via-white to-blue-50/50 py-4 -mx-6 px-6">
                            <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>Hủy</Button>
                            <Button size="lg" className="bg-blue-600 hover:bg-blue-700" onClick={handleGenerate} disabled={isGenerating || selectedDistricts.length === 0}>
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Đang xử lý...
                                    </>
                                ) : (
                                    <>
                                        <Download className="mr-2 h-5 w-5" />
                                        {isScheduled ? 'Lên lịch báo cáo' : 'Xuất Báo Cáo'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="list" className="flex-1 overflow-hidden p-6 pl-20 data-[state=inactive]:hidden">
                        <div className="grid grid-cols-12 gap-6 h-full">
                            {/* List Column */}
                            <div className="col-span-4 flex flex-col h-full border rounded-lg bg-white overflow-hidden min-h-0 shadow-sm">
                                <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-gray-50 to-blue-50/50 flex-none">
                                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                        Danh sách báo cáo
                                    </h3>
                                    <Button variant="ghost" size="sm" onClick={fetchReports} disabled={isLoadingReports}>
                                        <RefreshCw className={`h-4 w-4 ${isLoadingReports ? 'animate-spin' : ''}`} />
                                    </Button>
                                </div>
                                <div className="flex-1 min-h-0">
                                    <ScrollArea className="h-full w-full">
                                        <div className="p-4 space-y-4 pr-4">
                                            {/* Pending */}
                                            {pendingReports.length > 0 && (
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-bold text-yellow-600 uppercase tracking-wider">Đang xử lý</h4>
                                                    {pendingReports.map(report => (
                                                        <ReportItem 
                                                            key={report.id} 
                                                            report={report} 
                                                            isActive={selectedReport?.id === report.id}
                                                            onClick={() => handleViewReport(report)}
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
                                                            onClick={() => handleViewReport(report)}
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
                                                            onClick={() => handleViewReport(report)}
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
                            </div>

                            {/* Preview Column */}
                            <div className="col-span-8 flex flex-col h-full border rounded-lg bg-gradient-to-br from-gray-50 to-blue-50/30 overflow-hidden min-h-0 shadow-sm">
                                {selectedReport ? (
                                    <div className="flex flex-col h-full">
                                        <div className="p-4 border-b bg-gradient-to-r from-white to-blue-50/50 flex justify-between items-center shadow-sm flex-none">
                                            <div>
                                                <h3 className="font-bold text-lg text-gray-800">{selectedReport.fileName}</h3>
                                                <p className="text-sm text-gray-500">
                                                    Tạo lúc: {format(new Date(selectedReport.createdAt), "HH:mm dd/MM/yyyy")}
                                                </p>
                                            </div>
                                            <div className="flex gap-3">
                                                <Button 
                                                    variant="destructive" 
                                                    size="default"
                                                    onClick={() => handleDelete(selectedReport.id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Xóa
                                                </Button>
                                                <Button 
                                                    variant="default" 
                                                    size="default"
                                                    onClick={() => handleDownload(selectedReport)}
                                                    disabled={selectedReport.status !== 'COMPLETED'}
                                                >
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Tải xuống
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-h-0 overflow-y-auto p-6">
                                            {isLoadingDetail ? (
                                                <div className="flex flex-col items-center justify-center h-40">
                                                    <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-3" />
                                                    <p className="text-gray-500">Đang tải thông tin chi tiết...</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-5 bg-white p-6 rounded-xl shadow-sm border max-w-2xl mx-auto">
                                                    {/* Status & ID Header */}
                                                    <div className="flex items-center justify-between pb-4 border-b">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-medium text-gray-600">Trạng thái:</span>
                                                            <div className={cn(
                                                                "inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold",
                                                                selectedReport.status === 'COMPLETED' ? "bg-green-100 text-green-700" :
                                                                selectedReport.status === 'PENDING' ? "bg-yellow-100 text-yellow-700" :
                                                                "bg-red-100 text-red-700"
                                                            )}>
                                                                {selectedReport.status === 'COMPLETED' ? 'Sẵn sàng' : selectedReport.status === 'PENDING' ? 'Đang xử lý' : 'Lỗi'}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium text-gray-600">ID:</span>
                                                            <code className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">{selectedReport.id}</code>
                                                        </div>
                                                    </div>

                                                    {/* Time Range */}
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                                            <h4 className="text-sm font-medium text-blue-600 uppercase tracking-wider mb-2">Bắt đầu</h4>
                                                            <p className="text-lg font-bold text-gray-800">
                                                                {selectedReport.startTime ? format(new Date(selectedReport.startTime), "HH:mm") : "N/A"}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                {selectedReport.startTime ? format(new Date(selectedReport.startTime), "dd/MM/yyyy") : ""}
                                                            </p>
                                                        </div>
                                                        <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-100">
                                                            <h4 className="text-sm font-medium text-purple-600 uppercase tracking-wider mb-2">Kết thúc</h4>
                                                            <p className="text-lg font-bold text-gray-800">
                                                                {selectedReport.endTime ? format(new Date(selectedReport.endTime), "HH:mm") : "N/A"}
                                                            </p>
                                                            <p className="text-sm text-gray-600">
                                                                {selectedReport.endTime ? format(new Date(selectedReport.endTime), "dd/MM/yyyy") : ""}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Configuration */}
                                                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm text-gray-600">Interval:</span>
                                                            <p className="font-semibold text-gray-800">{selectedReport.interval ? `${selectedReport.interval} phút` : "N/A"}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm text-gray-600">Loại:</span>
                                                            <p className="font-semibold text-gray-800">{selectedReport.type || "PDF"}</p>
                                                        </div>
                                                    </div>

                                                    {/* Scope - Districts */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 pb-2 border-b">
                                                            <span className="w-1.5 h-5 bg-blue-500 rounded-full"></span>
                                                            <h4 className="text-base font-semibold text-gray-800">Quận/Huyện ({selectedReport.districts?.length || 0})</h4>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedReport.districts && selectedReport.districts.length > 0 ? (
                                                                selectedReport.districts.map((d, i) => (
                                                                    <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                                                                        {d}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-sm text-gray-500 italic">Toàn thành phố</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Scope - Cameras */}
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 pb-2 border-b">
                                                            <span className="w-1.5 h-5 bg-green-500 rounded-full"></span>
                                                            <h4 className="text-base font-semibold text-gray-800">Camera ({selectedReport.cameras?.length || 0})</h4>
                                                        </div>
                                                        {selectedReport.cameras && selectedReport.cameras.length > 0 ? (
                                                            <div className="max-h-40 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {selectedReport.cameras.map((c, i) => (
                                                                        <span key={i} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700">{c}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500 italic">Tất cả camera</p>
                                                        )}
                                                    </div>
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
    </>
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
                "flex items-center p-2 border rounded-md cursor-pointer transition-all",
                isActive ? "border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500" : "bg-white hover:border-blue-300 hover:shadow-sm"
            )}
        >
            <div className={`h-8 w-8 rounded-md flex items-center justify-center flex-none mr-2 ${
                report.status === 'FAILED' ? 'bg-red-100 text-red-600' : 
                report.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'
            }`}>
                <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <p className={cn("text-xs font-medium truncate", isActive ? "text-blue-700" : "text-gray-900")}>
                    {report.fileName}
                </p>
                <div className="flex justify-between items-center">
                    <p className="text-[10px] text-gray-500">{format(new Date(report.createdAt), "dd/MM/yyyy")}</p>
                    <span className={cn(
                        "text-[9px] px-1 py-0.5 rounded-full font-medium",
                        report.status === 'COMPLETED' ? "bg-green-100 text-green-700" :
                        report.status === 'PENDING' ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                    )}>
                        {report.status === 'COMPLETED' ? 'OK' : report.status === 'PENDING' ? '...' : 'Lỗi'}
                    </span>
                </div>
            </div>
        </div>
    )
}
