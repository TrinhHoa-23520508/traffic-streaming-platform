// lib/api/trafficApi.ts

import type { TrafficMetricsDTO } from '@/types/traffic';
import { API_CONFIG, getBaseUrl } from './config';

/**
 * Query parameters for /latest endpoint
 */
export interface LatestParams {
  district?: string;
}

/**
 * Query parameters for /summary/by-district endpoint
 */
export interface SummaryByDistrictParams {
  date?: string; // format: YYYY-MM-DD
}

/**
 * Query parameters for /by-date endpoint
 */
export interface ByDateParams {
  date?: string; // format: YYYY-MM-DD
  district?: string;
}

/**
 * Query parameters for /hourly-summary endpoint
 */
export interface HourlySummaryParams {
  date?: string; // format: YYYY-MM-DD
  district?: string;
}

/**
 * Response type for summary by district
 */
export type DistrictSummary = Record<string, number>;

/**
 * Response type for hourly summary
 */
export type HourlySummary = Record<number, number>; // hour (0-23) -> count

/**
 * Traffic API Service
 * Centralized service for all traffic-related API calls
 */
class TrafficApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = getBaseUrl();
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }
    return url.toString();
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchWithErrorHandling<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`⚠️ API Error (${url}):`, error);
      throw error;
    }
  }

  /**
   * GET /api/traffic/latest
   * Get 100 latest traffic records
   * 
   * @param params - Optional query parameters
   * @returns Promise<TrafficMetricsDTO[]>
   * 
   * @example
   * // Get all latest records
   * const data = await trafficApi.getLatest();
   * 
   * // Get latest records for specific district
   * const data = await trafficApi.getLatest({ district: 'Quận 1' });
   */
  async getLatest(params?: LatestParams): Promise<TrafficMetricsDTO[]> {
    const url = this.buildUrl(API_CONFIG.ENDPOINTS.TRAFFIC.LATEST, params as any);
    return this.fetchWithErrorHandling<TrafficMetricsDTO[]>(url);
  }

  /**
   * GET /api/traffic/summary/by-district
   * Get total count grouped by district
   * 
   * @param params - Optional query parameters
   * @returns Promise<DistrictSummary>
   * 
   * @example
   * // Get today's summary
   * const summary = await trafficApi.getSummaryByDistrict();
   * // Result: { "Quận 1": 150, "Quận 3": 230, ... }
   * 
   * // Get summary for specific date
   * const summary = await trafficApi.getSummaryByDistrict({ date: '2025-10-30' });
   */
  async getSummaryByDistrict(params?: SummaryByDistrictParams): Promise<DistrictSummary> {
    const url = this.buildUrl(API_CONFIG.ENDPOINTS.TRAFFIC.SUMMARY_BY_DISTRICT, params as any);
    return this.fetchWithErrorHandling<DistrictSummary>(url);
  }

  /**
   * GET /api/traffic/by-date
   * Get all records for a specific date
   * 
   * @param params - Optional query parameters
   * @returns Promise<TrafficMetricsDTO[]>
   * 
   * @example
   * // Get all records for today
   * const data = await trafficApi.getByDate();
   * 
   * // Get records for specific date and district
   * const data = await trafficApi.getByDate({ 
   *   date: '2025-10-30', 
   *   district: 'Quận 1' 
   * });
   */
  async getByDate(params?: ByDateParams): Promise<TrafficMetricsDTO[]> {
    const url = this.buildUrl(API_CONFIG.ENDPOINTS.TRAFFIC.BY_DATE, params as any);
    return this.fetchWithErrorHandling<TrafficMetricsDTO[]>(url);
  }

  /**
   * GET /api/traffic/hourly-summary
   * Get total count grouped by hour (0-23) for a specific date
   * 
   * @param params - Optional query parameters
   * @returns Promise<HourlySummary>
   * 
   * @example
   * // Get today's hourly summary
   * const summary = await trafficApi.getHourlySummary();
   * // Result: { 0: 10, 1: 5, 2: 3, ..., 23: 45 }
   * 
   * // Get hourly summary for specific date and district
   * const summary = await trafficApi.getHourlySummary({ 
   *   date: '2025-10-30', 
   *   district: 'Quận 1' 
   * });
   */
  async getHourlySummary(params?: HourlySummaryParams): Promise<HourlySummary> {
    const url = this.buildUrl(API_CONFIG.ENDPOINTS.TRAFFIC.HOURLY_SUMMARY, params as any);
    return this.fetchWithErrorHandling<HourlySummary>(url);
  }

  /**
   * Check if API is available
   * Useful for health checks
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getLatest();
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const trafficApi = new TrafficApiService();

// Also export class for testing or custom instances
export default TrafficApiService;
