// lib/api/trafficApi.ts

import type { TrafficMetricsDTO, CameraFlowRate, CameraMaxCount, DashboardUpdate } from '@/types/traffic';
import { API_CONFIG, getBaseUrl, getWsUrl } from './config';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { CityStatsByDistrict } from '@/types/city-stats';
import { ApiResponse } from '@/types/api';

/**
 * Query parameters for /latest endpoint
 */
export interface LatestParams {
  district?: string;
  date?: string;
}

/**
 * Query parameters for /summary/by-district endpoint
 */
export interface SummaryByDistrictParams {
  start?: string; // format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  end?: string;   // format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
}

/**
 * Query parameters for /by-date endpoint
 */
export interface ByDateParams {
  date?: string; // format: YYYY-MM-DD
  cameraId?: string;
}

/**
 * Query parameters for /hourly-summary endpoint
 */
export interface HourlySummaryParams {
  start?: string;
  end?: string;
  district?: string;
  cameraId?: string;
}

/**
 * Query parameters for /camera/{cameraId}/flow-rate endpoint
 */
export interface FlowRateParams {
  start?: string; // format: YYYY-MM-DDTHH:mm:ss or ISO 8601
  end?: string;   // format: YYYY-MM-DDTHH:mm:ss or ISO 8601
}

export interface DistrictDailySummary {
  totalCount: number;
  detectionDetailsSummary: Record<string, number>;
}

/**
 * Response type for hourly summary
 */
export type HourlySummary = Record<string, number>; // timestamp/label -> count

/**
 * Backend response format (camelCase)

 * Response type for summary by district (simple count map for backward compatibility)
 */
export type DistrictSummaryMap = Record<string, DistrictDailySummary>;

/**
 * Params for /api/traffic/cameras
 */
export interface CameraListParams {
  district?: string;
}

/**
 * Response type for /api/traffic/cameras
 */
export interface CameraList {
  cameraId: string;
  district: string;
  cameraName: string;
}

interface BackendTrafficDataRaw {
  id?: number;
  cameraId?: string;
  cameraName?: string;
  totalCount?: number;
  maxCount?: number;
  annotatedImageUrl?: string;
  detectionDetails?: Record<string, number>;

  camera_id?: string;
  camera_name?: string;
  total_count?: number;
  max_count?: number;
  annotated_image_url?: string;
  detection_details?: Record<string, number>;
  timestamp_vn?: string;

  district: string;
  coordinates: [number, number];
  timestamp: string | number;
}


function transformTrafficData(data: BackendTrafficDataRaw): TrafficMetricsDTO {
  const cid = data.cameraId || data.camera_id || 'unknown';
  const cname = data.cameraName || data.camera_name || 'Unknown Camera';
  const total = data.totalCount ?? data.total_count ?? 0;
  const max = data.maxCount ?? data.max_count;
  const details = data.detectionDetails || data.detection_details || {};
  const imgUrl = data.annotatedImageUrl || data.annotated_image_url || '';

  let timeStr: string;
  if (typeof data.timestamp === 'string') {
    timeStr = data.timestamp;
  } else if (data.timestamp_vn) {
    timeStr = data.timestamp_vn;
  } else {
    timeStr = new Date(data.timestamp).toISOString();
  }

  return {
    id: data.id || Date.now(),
    cameraId: cid,
    cameraName: cname,
    district: data.district,
    annotatedImageUrl: imgUrl,
    coordinates: data.coordinates,
    detectionDetails: details as any,
    totalCount: total,
    maxCount: max,
    timestamp: timeStr
  };
}

/**
 * Traffic data update callback
 */
export type TrafficUpdateCallback = (data: TrafficMetricsDTO) => void;

/**
 * City stats update callback
 */
export type CityStatsUpdateCallback = (data: DashboardUpdate) => void;

class TrafficApiService {
  private baseUrl: string;
  private stompClient: Client | null = null;
  private subscribers: Set<TrafficUpdateCallback> = new Set();
  private cityStatsSubscribers: Set<CityStatsUpdateCallback> = new Set();
  private trafficDataCache: Map<string, TrafficMetricsDTO> = new Map();
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private fallbackInterval: NodeJS.Timeout | null = null;
  private useFallback: boolean = false;

  constructor() {
    this.baseUrl = getBaseUrl();
  }

  private initWebSocket() {
    if (this.isConnecting || this.isConnected) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = getWsUrl();

    const connectionTimeout = setTimeout(() => {
      if (!this.isConnected) {
        console.warn('⚠️ WebSocket connection timeout. Using fallback mode.');
        this.startFallbackMode();
      }
    }, 15000);

    const client = new Client({
      brokerURL: undefined,
      webSocketFactory: () => {
        return new SockJS(wsUrl, null, {
          transports: ['websocket', 'xhr-streaming', 'xhr-polling']
        });
      },
      reconnectDelay: API_CONFIG.RECONNECT_DELAY,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      connectionTimeout: API_CONFIG.DEFAULT_TIMEOUT,
      onConnect: () => {
        clearTimeout(connectionTimeout);
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.stopFallbackMode();

        console.log('✅ WebSocket connected, real-time traffic updates active');

        // Subscribe to traffic topic
        client.subscribe(API_CONFIG.WS_TOPIC, (message) => {
          try {
            const rawData: BackendTrafficDataRaw = JSON.parse(message.body);
            const trafficData = transformTrafficData(rawData);

            // Update cache
            this.trafficDataCache.set(trafficData.cameraId, trafficData);

            this.subscribers.forEach(callback => callback(trafficData));
          } catch (error) {
            console.error('Error parsing traffic data:', error);
          }
        });

        client.subscribe(API_CONFIG.WS_CITY_STATS_TOPIC, (message) => {
          try {
            const cityStatsData = JSON.parse(message.body);
            this.cityStatsSubscribers.forEach(callback => callback(cityStatsData));
          } catch (error) {
            console.error('Error parsing city stats data:', error);
          }
        });
      },
      onStompError: (frame) => {
        console.error('❌ STOMP error:', frame.headers['message']);
        this.handleDisconnection();
      },
      onWebSocketError: (event) => {
        console.error('❌ WebSocket error:', event);
        this.handleDisconnection();
      },
      onWebSocketClose: () => {
        this.handleDisconnection();
      },
      onDisconnect: () => {
        this.isConnected = false;
        this.isConnecting = false;
      }
    });

    try {
      client.activate();
      this.stompClient = client;
    } catch (error) {
      console.error('Failed to activate STOMP client:', error);
      this.handleDisconnection();
    }
  }

  private handleDisconnection() {
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts++;

    if (this.reconnectAttempts >= API_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.startFallbackMode();
    }
  }

  private startFallbackMode() {
    if (this.fallbackInterval || this.useFallback) return;
    this.useFallback = true;
    console.log('📡 Backend unavailable, generating random traffic data...');

    const generateData = () => {
      const cameraIds = Array.from(this.trafficDataCache.keys());
      if (cameraIds.length === 0) return;
      this.generateRandomTrafficData();
    };

    generateData();
    this.fallbackInterval = setInterval(generateData, 5000);
  }

  private generateRandomTrafficData() {
    const cameraIds = Array.from(this.trafficDataCache.keys());
    if (cameraIds.length === 0) return;

    cameraIds.forEach(cameraId => {
      const carCount = Math.floor(Math.random() * 30);
      const motorcycleCount = Math.floor(Math.random() * 20);

      const randomTraffic: TrafficMetricsDTO = {
        id: Date.now(),
        cameraId,
        cameraName: cameraId,
        totalCount: carCount + motorcycleCount,
        maxCount: 100,
        detectionDetails: { car: carCount, motorcycle: motorcycleCount },
        timestamp: new Date().toISOString(),
        district: 'Unknown',
        annotatedImageUrl: '',
        coordinates: [0, 0]
      };

      this.trafficDataCache.set(cameraId, randomTraffic);
      this.subscribers.forEach(callback => callback(randomTraffic));
    });
  }

  private stopFallbackMode() {
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
    this.useFallback = false;
  }

  subscribe(callback: TrafficUpdateCallback): () => void {
    this.subscribers.add(callback);
    if (this.subscribers.size === 1 && this.cityStatsSubscribers.size === 0 && !this.isConnected && !this.isConnecting) {
      this.initWebSocket();
    }
    return () => {
      this.subscribers.delete(callback);
      if (this.subscribers.size === 0 && this.cityStatsSubscribers.size === 0) this.cleanup();
    };
  }

  subscribeCityStats(callback: CityStatsUpdateCallback): () => void {
    this.cityStatsSubscribers.add(callback);
    if (this.subscribers.size === 0 && this.cityStatsSubscribers.size === 1 && !this.isConnected && !this.isConnecting) {
      this.initWebSocket();
    }
    return () => {
      this.cityStatsSubscribers.delete(callback);
      if (this.subscribers.size === 0 && this.cityStatsSubscribers.size === 0) this.cleanup();
    };
  }

  getCachedData(cameraId: string): TrafficMetricsDTO | undefined {
    return this.trafficDataCache.get(cameraId);
  }

  getAllCachedData(): TrafficMetricsDTO[] {
    return Array.from(this.trafficDataCache.values());
  }

  initializeCameraIds(cameraIds: string[]): void {
    cameraIds.forEach(id => {
      if (!this.trafficDataCache.has(id)) {
        this.trafficDataCache.set(id, {
          id: Date.now(),
          cameraId: id,
          cameraName: id,
          totalCount: 0,
          maxCount: 100,
          detectionDetails: {},
          timestamp: new Date().toISOString(),
          district: 'Unknown',
          annotatedImageUrl: '',
          coordinates: [0, 0]
        });
      }
    });
  }

  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  private cleanup() {
    this.stopFallbackMode();
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
  }

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
   * Generic fetch wrapper with Error Handling and ApiResponse Unwrapping
   */
  private async fetchWithErrorHandling<T>(url: string): Promise<T> {
    try {
      console.log('🌐 Fetching API:', url);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'cors',
      });

      console.log('📡 API Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error body');
        console.error('❌ API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          body: errorText
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiResponse: ApiResponse<T> = await response.json();
      console.log('✅ API Response data:', apiResponse);

      if (!apiResponse.success) {
        throw new Error(apiResponse.message || 'Unknown API Error');
      }

      return apiResponse.data;
    } catch (error) {
      console.error(`⚠️ API Error (${url}):`, error);
      throw error;
    }
  }


  /**
   * GET /api/traffic/latest
   */
  async getLatest(params?: LatestParams): Promise<TrafficMetricsDTO[]> {
    const url = this.buildUrl(API_CONFIG.ENDPOINTS.TRAFFIC.LATEST, params as any);
    const rawData = await this.fetchWithErrorHandling<BackendTrafficDataRaw[]>(url);
    return rawData.map(transformTrafficData);
  }

  /**
   * GET /api/traffic/summary/by-district
   * Get total count grouped by district
   * 
   * @param params - Optional query parameters
   * @returns Promise<CityStatsByDistrict>
   * 
   * @example
   * // Get today's summary
   * const summary = await trafficApi.getDistrictSummary();
   * // Result: { "Quận 1": { totalCount: 150, detectionDetailsSummary: {...} }, ... }
   * 
   * // Get summary for specific date range
   * const summary = await trafficApi.getDistrictSummary({ 
   *   start: '2025-12-01',
   *   end: '2025-12-01'
   * });
   */
  async getDistrictSummary(params?: SummaryByDistrictParams): Promise<CityStatsByDistrict> {
    const url = this.buildUrl(API_CONFIG.ENDPOINTS.TRAFFIC.SUMMARY_BY_DISTRICT, params as any);
    return this.fetchWithErrorHandling<DistrictSummaryMap>(url);
  }

  /**
   * GET /api/traffic/by-date
   */
  async getByDate(params?: ByDateParams): Promise<TrafficMetricsDTO[]> {
    const url = this.buildUrl(API_CONFIG.ENDPOINTS.TRAFFIC.BY_DATE, params as any);
    const rawData = await this.fetchWithErrorHandling<BackendTrafficDataRaw[]>(url);
    return rawData.map(transformTrafficData);
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
   * // Result: { "2025-12-02T07:00:00": 150, ... }
   * 
   * // Get hourly summary for specific range
   * const summary = await trafficApi.getHourlySummary({ 
   *   start: '2025-12-02T07:00:00', 
   *   end: '2025-12-02T17:00:00' 
   * });

   */
  async getHourlySummary(params?: HourlySummaryParams): Promise<HourlySummary> {
    if (params?.cameraId && params?.district) {
      delete params.district;
    }
    const url = this.buildUrl(API_CONFIG.ENDPOINTS.TRAFFIC.HOURLY_SUMMARY, params as any);
    return this.fetchWithErrorHandling<HourlySummary>(url);
  }

  /**
   * GET /api/traffic/camera/{cameraId}/latest
   */
  async getCameraLatest(cameraId: string): Promise<TrafficMetricsDTO> {
    const encodedCameraId = encodeURIComponent(cameraId);
    const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRAFFIC.CAMERA_LATEST}/${encodedCameraId}/latest`;
    const rawData = await this.fetchWithErrorHandling<BackendTrafficDataRaw>(url);
    return transformTrafficData(rawData);
  }

  /**
   * GET /api/traffic/districts
   */
  async getAllDistricts(): Promise<string[]> {
    const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRAFFIC.DISTRICTS}`;
    return this.fetchWithErrorHandling<string[]>(url);
  }

  /**
   * GET /api/traffic/cameras
   */
  async getAllCameras(params?: CameraListParams): Promise<CameraList[]> {
    const url = this.buildUrl(`${this.baseUrl}${API_CONFIG.ENDPOINTS.TRAFFIC.CAMERAS}`, params as any);
    return this.fetchWithErrorHandling<CameraList[]>(url);
  }

  async getMinuteSummary(params?: HourlySummaryParams): Promise<HourlySummary> {
    if (params?.cameraId && params?.district) {
      delete params.district;
    }
    const url = this.buildUrl(API_CONFIG.ENDPOINTS.TRAFFIC.MINUTE_SUMMARY, params as any);
    return this.fetchWithErrorHandling<HourlySummary>(url);
  }

  /**
   * GET /api/traffic/camera/{cameraId}/flow-rate
   * Get average flow rate (vehicles/minute) for a specific camera
   * 
   * @param cameraId - The camera ID
   * @param params - Optional query parameters for time range
   * @returns Promise<CameraFlowRate>
   * 
   * @example
   * // Get current flow rate
   * const flowRate = await trafficApi.getCameraFlowRate('cam-001');
   * 
   * // Get flow rate for specific time range
   * const flowRate = await trafficApi.getCameraFlowRate('cam-001', {
   *   start: '2025-12-25T08:00:00',
   *   end: '2025-12-25T12:00:00'
   * });
   */
  async getCameraFlowRate(cameraId: string, params?: FlowRateParams): Promise<CameraFlowRate> {
    const encodedCameraId = encodeURIComponent(cameraId);
    const baseEndpoint = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRAFFIC.CAMERA_FLOW_RATE}/${encodedCameraId}/flow-rate`;
    const url = this.buildUrl(baseEndpoint, params as any);
    console.log('🌐 Calling flow-rate API:', url);
    return this.fetchWithErrorHandling<CameraFlowRate>(url);
  }

  /**
   * GET /api/traffic/camera/{cameraId}/max-count
   * Get peak traffic record (max vehicle count) for a specific camera
   * 
   * @param cameraId - The camera ID
   * @returns Promise<CameraMaxCount>
   * 
   * @example
   * const maxCount = await trafficApi.getCameraMaxCount('TTH 282.1');
   * // Returns: { cameraId, maxVehicleCount, district, timestamp }
   */
  async getCameraMaxCount(cameraId: string): Promise<CameraMaxCount> {
    const encodedCameraId = encodeURIComponent(cameraId);
    const url = `${this.baseUrl}${API_CONFIG.ENDPOINTS.TRAFFIC.CAMERA_MAX_COUNT}/${encodedCameraId}/max-count`;
    console.log('🌐 Calling max-count API:', url);
    return this.fetchWithErrorHandling<CameraMaxCount>(url);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.getLatest();
      return true;
    } catch {
      return false;
    }
  }
}

export const trafficApi = new TrafficApiService();
export default TrafficApiService;