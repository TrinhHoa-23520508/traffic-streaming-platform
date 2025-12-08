import { ApiResponse } from '@/types/api';
import { getBaseUrl } from './config';
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
  startDate: string;
  endDate: string;
  interval: string;
  districtId?: string;
  cameraIds?: string[];
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
                 return districtNames.map(name => ({
                    id: name,
                    name: name,
                    code: name.toLowerCase().replace(/\s+/g, '-')
                }));
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
    // Client-side PDF generation using real data from Traffic API
    // Note: Backend currently supports single-day queries. We use startDate.
    try {
        const reportDate = request.startDate ? format(new Date(request.startDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        const reportId = `report-${Date.now()}`;
        const fileName = `traffic-report-${reportDate}.pdf`;
        
        // Create a new report entry
        const newReport: Report = {
            id: reportId,
            fileName: fileName,
            fileUrl: '', // Not used for client-side generation
            createdAt: new Date().toISOString(),
            type: 'PDF',
            status: 'COMPLETED'
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
        // Try fetching from backend first (if available in future)
        // const response = await fetch(`${getBaseUrl()}/api/reports`);
        // if (response.ok) { ... }

        // Fallback to localStorage
        const reportsStr = localStorage.getItem('traffic_reports');
        return reportsStr ? JSON.parse(reportsStr) : [];
    } catch (error) {
        console.warn("Error fetching reports:", error);
        return [];
    }
  },
  
  downloadReport: async (reportId: string, fileName: string): Promise<void> => {
      try {
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
  }
};

export default reportApi;
