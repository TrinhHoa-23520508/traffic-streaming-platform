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
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
        <div
            className="bg-white w-full h-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog" aria-modal="true"
        >
            <div className="flex items-center justify-center py-4 px-6 border-b border-gray-200 relative flex-none bg-white">
                <div className="text-center">
                    <h1 className="text-black text-2xl font-bold">Báo Cáo Giao Thông</h1>
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
                                    <h3 className="text-lg font-semibold text-gray-900">Cấu hình báo cáo</h3>
                                    
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
                                    <Label className="text-lg font-semibold text-gray-900">Chọn Quận / Huyện ({selectedDistricts.length})</Label>
                                    <div className="border rounded-lg p-4 bg-slate-50/50">
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
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Danh sách Camera {selectedDistricts.length > 0 ? `(${cameras.length})` : ''}
                                </h3>
                                
                                {/* 
                                    === HƯỚNG DẪN CHỈNH KÍCH THƯỚC KHUNG CAMERA ===
                                    - h-[700px]: Chiều cao khung (height). Đổi số này để tăng/giảm chiều cao.
                                      Ví dụ: h-[500px], h-[800px], h-[90vh] (90% chiều cao màn hình)
                                    - Để thay đổi chiều rộng: thêm class như w-full, w-[400px], max-w-lg, etc.
                                */}
                                <div className="border rounded-lg bg-slate-50/50 h-[700px] overflow-hidden flex flex-col">
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
                        <div className="pt-6 flex justify-end gap-4 border-t mt-8 sticky bottom-0 bg-white py-4 -mx-6 px-6">
                            <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>Hủy</Button>
                            <Button size="lg" onClick={handleGenerate} disabled={isGenerating || selectedDistricts.length === 0}>
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
                        <div className="grid grid-cols-12 gap-4 h-full">
                            {/* List Column - narrower */}
                            <div className="col-span-3 flex flex-col h-full border rounded-lg bg-white overflow-hidden min-h-0">
                                <div className="p-4 border-b flex justify-between items-center bg-gray-50 flex-none">
                                    <h3 className="font-semibold text-gray-700">Danh sách báo cáo</h3>
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

                            {/* Preview Column - wider */}
                            <div className="col-span-9 flex flex-col h-full border rounded-lg bg-gray-50 overflow-hidden min-h-0">
                                {selectedReport ? (
                                    <div className="flex flex-col h-full">
                                        <div className="p-3 border-b bg-white flex justify-between items-center shadow-sm flex-none">
                                            <div>
                                                <h3 className="font-bold text-base text-gray-900">{selectedReport.fileName}</h3>
                                                <p className="text-xs text-gray-500">
                                                    Tạo lúc: {format(new Date(selectedReport.createdAt), "HH:mm dd/MM/yyyy")}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button 
                                                    variant="destructive" 
                                                    size="sm"
                                                    onClick={() => handleDelete(selectedReport.id)}
                                                >
                                                    <Trash2 className="mr-1 h-3 w-3" />
                                                    Xóa
                                                </Button>
                                                <Button 
                                                    variant="default" 
                                                    size="sm"
                                                    onClick={() => handleDownload(selectedReport)}
                                                    disabled={selectedReport.status !== 'COMPLETED'}
                                                >
                                                    <Download className="mr-1 h-3 w-3" />
                                                    Tải xuống
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-h-0 overflow-y-auto p-4">
                                            {isLoadingDetail ? (
                                                <div className="flex flex-col items-center justify-center h-40">
                                                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-2" />
                                                    <p className="text-gray-500 text-sm">Đang tải thông tin chi tiết...</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 bg-white p-4 rounded-lg shadow-sm border">
                                                    {/* Status Header */}
                                                    <div className="flex items-center justify-between pb-3 border-b">
                                                        <div>
                                                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Trạng thái</h4>
                                                            <div className={cn(
                                                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                                                selectedReport.status === 'COMPLETED' ? "bg-green-100 text-green-700" :
                                                                selectedReport.status === 'PENDING' ? "bg-yellow-100 text-yellow-700" :
                                                                "bg-red-100 text-red-700"
                                                            )}>
                                                                {selectedReport.status === 'COMPLETED' ? 'Sẵn sàng' : selectedReport.status === 'PENDING' ? 'Đang xử lý' : 'Lỗi'}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">ID</h4>
                                                            <p className="font-mono text-xs text-gray-700">{selectedReport.id}</p>
                                                        </div>
                                                    </div>

                                                    {/* Time Range */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Bắt đầu</h4>
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                {selectedReport.startTime ? format(new Date(selectedReport.startTime), "HH:mm dd/MM/yyyy") : "N/A"}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Kết thúc</h4>
                                                            <p className="text-sm font-semibold text-gray-900">
                                                                {selectedReport.endTime ? format(new Date(selectedReport.endTime), "HH:mm dd/MM/yyyy") : "N/A"}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Configuration */}
                                                    <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-md">
                                                        <div>
                                                            <span className="text-xs text-gray-500">Interval:</span>
                                                            <p className="font-medium text-sm text-gray-900">{selectedReport.interval ? `${selectedReport.interval} phút` : "N/A"}</p>
                                                        </div>
                                                        <div>
                                                            <span className="text-xs text-gray-500">Loại:</span>
                                                            <p className="font-medium text-sm text-gray-900">{selectedReport.type || "PDF"}</p>
                                                        </div>
                                                    </div>

                                                    {/* Scope */}
                                                    <div className="space-y-2">
                                                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider border-b pb-1">Phạm vi</h4>
                                                        
                                                        <div>
                                                            <span className="text-xs font-medium text-gray-700">Quận/Huyện ({selectedReport.districts?.length || 0})</span>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {selectedReport.districts && selectedReport.districts.length > 0 ? (
                                                                    selectedReport.districts.map((d, i) => (
                                                                        <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-100">
                                                                            {d}
                                                                        </span>
                                                                    ))
                                                                ) : (
                                                                    <span className="text-xs text-gray-400 italic">Toàn thành phố</span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <span className="text-xs font-medium text-gray-700">Camera ({selectedReport.cameras?.length || 0})</span>
                                                            {selectedReport.cameras && selectedReport.cameras.length > 0 ? (
                                                                <div className="max-h-24 overflow-y-auto border rounded p-1.5 bg-gray-50 text-xs text-gray-600 mt-1">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {selectedReport.cameras.map((c, i) => (
                                                                            <span key={i} className="px-1.5 py-0.5 bg-white border rounded text-[10px]">{c}</span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs text-gray-400 italic mt-1">Tất cả camera</p>
                                                            )}
                                                        </div>
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
