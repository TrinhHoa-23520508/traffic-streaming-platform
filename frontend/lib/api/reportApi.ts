import { ApiResponse } from '@/types/api';
import { getBaseUrl, API_CONFIG } from './config';
import { trafficApi } from './trafficApi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subDays } from 'date-fns';

export interface District {
  id: string;
  name: string;
  code: string;
}

export interface Camera {
  id: string;
  name: string;
  districtId: string;
}

export interface Report {
  id: string;
  fileName: string;
  fileUrl: string;
  createdAt: string;
  type: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface GenerateReportRequest {
  name?: string;
  startDate: string;
  endDate: string;
  interval: string;
  districtId?: string;
  cameraIds?: string[];
}

interface BackendReportRequest {
  name: string;
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  districts: string[];
  cameras: string[];
  executeAt: string;
}

const reportApi = {
  getDistricts: async (): Promise<District[]> => {
    // Use existing traffic API to get list of districts
    // We fetch summary for last 3 days to get active districts
    try {
        // 1. Try to get from getAllDistricts if available (best source)
        try {
            const districtNames = await trafficApi.getAllDistricts();
            if (districtNames && districtNames.length > 0) {
                 return districtNames.map((item: any) => {
                    // Handle case where backend returns object { districtName: "..." } instead of string
                    const name = typeof item === 'object' && item.districtName ? item.districtName : String(item);
                    return {
                        id: name,
                        name: name,
                        code: name.toLowerCase().replace(/\s+/g, '-')
                    };
                });
            }
        } catch (e) {
            // Fallback if endpoint not implemented
        }

        // 2. Fallback: Scan recent traffic data
        const dates = [0, 1, 2].map(days => format(subDays(new Date(), days), 'yyyy-MM-dd'));
        
        const summaries = await Promise.all(dates.map(date => 
            trafficApi.getDistrictSummary({ date } as any).catch(() => ({}))
        ));
        
        const allDistricts = new Set<string>();
        
        // Add hardcoded districts for HCMC as a baseline (in case no data yet)
        const commonDistricts = [
            "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6", "Quận 7", "Quận 8", "Quận 10", "Quận 11", "Quận 12",
            "Quận Bình Thạnh", "Quận Bình Tân", "Quận Gò Vấp", "Quận Phú Nhuận", "Quận Tân Bình", "Quận Tân Phú",
            "Thành phố Thủ Đức", "Huyện Bình Chánh", "Huyện Củ Chi", "Huyện Hóc Môn", "Huyện Nhà Bè", "Huyện Cần Giờ"
        ];
        commonDistricts.forEach(d => allDistricts.add(d));

        // Add any dynamic ones found
        summaries.forEach(summary => {
            if (summary) {
                Object.keys(summary).forEach(d => allDistricts.add(d));
            }
        });

        const districts = Array.from(allDistricts).map(name => ({
            id: name,
            name: name,
            code: name.toLowerCase().replace(/\s+/g, '-')
        }));
        return districts.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Error fetching districts from traffic API:", error);
        return [];
    }
  },

  getCamerasByDistrict: async (districtId: string): Promise<Camera[]> => {
    // Use existing traffic API to get cameras for a district
    try {
        const metrics = await trafficApi.getLatest({ district: districtId });
        // metrics is List<TrafficMetric>
        // Extract unique cameras
        const uniqueCameras = new Map<string, Camera>();
        
        metrics.forEach(m => {
            // TrafficMetricsDTO uses camelCase, but we check for snake_case just in case raw data leaks through
            const id = m.cameraId || (m as any).camera_id;
            const name = m.cameraName || (m as any).camera_name || id;
            if (id && !uniqueCameras.has(id)) {
                uniqueCameras.set(id, {
                    id,
                    name,
                    districtId
                });
            }
        });
        
        return Array.from(uniqueCameras.values());
    } catch (error) {
        console.error("Error fetching cameras from traffic API:", error);
        return [];
    }
  },

  generateReport: async (request: GenerateReportRequest): Promise<void> => {
    try {
        // 1. Try creating report via Backend API
        
        // Ensure we have cameras. If none selected, fetch all for the district.
        let targetCameras = request.cameraIds || [];
        if (targetCameras.length === 0 && request.districtId) {
            try {
                const districtCameras = await reportApi.getCamerasByDistrict(request.districtId);
                targetCameras = districtCameras.map(c => c.id);
            } catch (e) {
                console.warn("Failed to auto-fetch cameras for district", e);
            }
        }

        // Calculate executeAt:
        // If report end time is in the past -> Execute immediately (now + small buffer)
        // If report end time is in the future -> Execute at end time + small buffer
        const now = new Date();
        const endTime = new Date(request.endDate);
        
        // Buffer of 2 seconds as requested (to ensure backend receives a future timestamp)
        const bufferMs = 2000; 
        const executeTime = new Date(Math.max(now.getTime(), endTime.getTime()) + bufferMs);

        // Transform to backend payload format
        const backendPayload: BackendReportRequest = {
            name: request.name || `Báo cáo giao thông ${format(new Date(request.startDate), 'dd/MM/yyyy')}`,
            startTime: format(new Date(request.startDate), "yyyy-MM-dd'T'HH:mm:ssXXX"),
            endTime: format(new Date(request.endDate), "yyyy-MM-dd'T'HH:mm:ssXXX"),
            intervalMinutes: parseInt(request.interval),
            districts: request.districtId ? [request.districtId] : [],
            cameras: targetCameras,
            executeAt: format(executeTime, "yyyy-MM-dd'T'HH:mm:ssXXX")
        };

        const response = await fetch(`${getBaseUrl()}${API_CONFIG.ENDPOINTS.REPORTS.BASE}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(backendPayload)
        });

        if (response.ok) {
            return;
        }
        
        // If 400, throw error to stop fallback
        if (response.status === 400) {
             const result = await response.json().catch(() => ({}));
             throw new Error(result?.message || "Invalid report request data");
        }
    } catch (e: any) {
        // If it was a validation error, re-throw so UI shows it
        if (e.message && (e.message.includes("Invalid") || e.message.includes("400"))) {
            throw e;
        }
        // Otherwise fall back
    }

    // 2. Fallback: Client-side generation (Only if backend fails)
    try {
        const reportDate = request.startDate ? format(new Date(request.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        // If report date is in the future (tomorrow or later), status is PENDING
        const isFutureReport = reportDate > todayStr;

        const reportId = `report-${Date.now()}`;
        const fileName = `traffic-report-${reportDate}.pdf`;
        
        // Create a new report entry
        const newReport: Report = {
            id: reportId,
            fileName: fileName,
            fileUrl: '', // Not used for client-side generation
            createdAt: new Date().toISOString(),
            type: 'PDF',
            status: isFutureReport ? 'PENDING' : 'COMPLETED'
        };

        // Save report metadata to localStorage
        const existingReportsStr = localStorage.getItem('traffic_reports');
        const existingReports: Report[] = existingReportsStr ? JSON.parse(existingReportsStr) : [];
        localStorage.setItem('traffic_reports', JSON.stringify([newReport, ...existingReports]));

        // Save request params for this report so we can regenerate it on download
        localStorage.setItem(`report_params_${reportId}`, JSON.stringify(request));

    } catch (error) {
        console.error("Error generating report:", error);
        throw new Error("Failed to generate report. Please try again.");
    }
  },

  getReports: async (): Promise<Report[]> => {
    try {
        // Try fetching from backend first
        const response = await fetch(`${getBaseUrl()}${API_CONFIG.ENDPOINTS.REPORTS.BASE}`);
        if (response.ok) {
            const jsonResponse = await response.json();
            
            // Handle wrapped response format { data: [...] }
            if (jsonResponse.data && Array.isArray(jsonResponse.data)) {
                return jsonResponse.data.map((item: any) => ({
                    id: item.id.toString(),
                    fileName: item.name,
                    fileUrl: item.fileUrl || '',
                    createdAt: item.createdAt,
                    type: 'PDF',
                    status: item.status
                }));
            }
            // Handle direct array format (fallback)
            if (Array.isArray(jsonResponse)) {
                return jsonResponse;
            }
        }
    } catch (error) {
        console.warn("Error fetching reports from backend:", error);
    }

    // Fallback to localStorage
    const reportsStr = localStorage.getItem('traffic_reports');
    return reportsStr ? JSON.parse(reportsStr) : [];
  },
  
  downloadReport: async (reportId: string, fileName: string): Promise<void> => {
      try {
          // 1. Try downloading from backend first
          try {
              // Correct endpoint based on Swagger: /api/reports/download/{reportId}
              const response = await fetch(`${getBaseUrl()}${API_CONFIG.ENDPOINTS.REPORTS.DOWNLOAD}/${reportId}`);
              if (response.ok) {
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  return; // Success, exit
              }
          } catch (e) {
              console.warn("Backend download failed, falling back to local generation");
          }

          // 2. Fallback: Client-side generation
          // Retrieve params
          const paramsStr = localStorage.getItem(`report_params_${reportId}`);
          if (!paramsStr) {
              throw new Error("Report data not found");
          }
          const request: GenerateReportRequest = JSON.parse(paramsStr);
          const reportDate = request.startDate ? format(new Date(request.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

          const doc = new jsPDF();
          let data: any[] = [];
          let title = 'Traffic Report';

          if (request.districtId) {
            // Report for a specific district: Show Hourly Summary
            const summary = await trafficApi.getHourlySummary({
                date: reportDate,
                district: request.districtId
            } as any);

            // summary is Map<Integer, Long> (Hour -> Count)
            data = Object.entries(summary).map(([hour, count]) => [
                `${hour}:00`,
                request.districtId,
                count
            ]);
            
            // Sort by hour
            data.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
            
            title = `Traffic Report - ${request.districtId} (${reportDate})`;
        } else {
            // Report for All Districts: Show Daily Summary
            const summary = await trafficApi.getDistrictSummary({
                date: reportDate
            } as any);

            // summary is Map<String, DistrictDailySummaryDTO>
            data = Object.entries(summary).map(([district, stats]) => [
                district,
                stats.totalCount,
                // Format details nicely
                Object.entries(stats.detectionDetailsSummary || {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ')
            ]);
            title = `Traffic Report - All Districts (${reportDate})`;
        }

        // Add Title
        doc.setFontSize(18);
        doc.text(title, 14, 22);
        doc.setFontSize(11);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        // Add Table
        autoTable(doc, {
            startY: 40,
            head: request.districtId 
                ? [['Hour', 'District', 'Vehicle Count']]
                : [['District', 'Total Count', 'Vehicle Details']],
            body: data,
        });

        // Save
        doc.save(fileName);

      } catch (error) {
          console.error("Download failed:", error);
          throw new Error('Download failed');
      }
  },

  deleteReport: async (reportId: string): Promise<void> => {
    try {
        // Try deleting from backend first
        try {
             await fetch(`${getBaseUrl()}${API_CONFIG.ENDPOINTS.REPORTS.BASE}/${reportId}`, {
                 method: 'DELETE',
             });
        } catch (e) {
            console.warn("Backend report deletion failed, falling back to local only");
        }

        // Delete from localStorage
        const reportsStr = localStorage.getItem('traffic_reports');
        if (reportsStr) {
            const reports: Report[] = JSON.parse(reportsStr);
            const updatedReports = reports.filter(r => r.id !== reportId);
            localStorage.setItem('traffic_reports', JSON.stringify(updatedReports));
        }
        
        // Clean up params
        localStorage.removeItem(`report_params_${reportId}`);

    } catch (error) {
        console.error("Delete failed:", error);
        throw new Error('Delete failed');
    }
  }
};

export default reportApi;
