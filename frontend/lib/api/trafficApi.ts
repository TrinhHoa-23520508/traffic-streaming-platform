// lib/api/trafficApi.ts

import type { TrafficMetricsDTO } from '@/types/traffic';
import { API_CONFIG, getBaseUrl, getWsUrl } from './config';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

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
 * Traffic data update callback
 */
export type TrafficUpdateCallback = (data: TrafficMetricsDTO) => void;

/**
 * Traffic API Service
 * Centralized service for all traffic-related API calls and WebSocket management
 */
class TrafficApiService {
  private baseUrl: string;
  private stompClient: Client | null = null;
  private subscribers: Set<TrafficUpdateCallback> = new Set();
  private trafficDataCache: Map<string, TrafficMetricsDTO> = new Map();
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private fallbackInterval: NodeJS.Timeout | null = null;
  private useFallback: boolean = false;

  constructor() {
    this.baseUrl = getBaseUrl();
  }

  /**
   * Initialize WebSocket connection
   * Called automatically when first subscriber is added
   */
  private initWebSocket() {
    if (this.isConnecting || this.isConnected) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = getWsUrl();

    // Set timeout to switch to fallback mode
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
            const trafficData: TrafficMetricsDTO = JSON.parse(message.body);
            
            // Update cache
            this.trafficDataCache.set(trafficData.cameraId, trafficData);
            
            // Notify all subscribers
            this.subscribers.forEach(callback => callback(trafficData));
          } catch (error) {
            console.error('Error parsing traffic data:', error);
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

  /**
   * Handle disconnection and attempt reconnection or fallback
   */
  private handleDisconnection() {
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts++;

    if (this.reconnectAttempts >= API_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.warn('⚠️ Max reconnection attempts reached. Switching to fallback mode.');
      this.startFallbackMode();
    }
  }

  /**
   * Start fallback mode - generate random data since backend is unavailable
   */
  private startFallbackMode() {
    if (this.fallbackInterval || this.useFallback) {
      return;
    }

    this.useFallback = true;
    console.log('📡 Backend unavailable, generating random traffic data...');

    const generateData = () => {
      const cameraIds = Array.from(this.trafficDataCache.keys());
      
      if (cameraIds.length === 0) {
        console.log('⚠️ No cameras in cache, skipping random data generation');
        return;
      }

      console.log('🎲 Generating random traffic data for', cameraIds.length, 'cameras');
      this.generateRandomTrafficData();
    };

    // Initial generation
    generateData();

    // Generate new random data every 5 seconds
    this.fallbackInterval = setInterval(generateData, 5000);
  }

  /**
   * Generate random traffic data for all cached cameras
   */
  private generateRandomTrafficData() {
    // Generate random data for all cameras in cache or create dummy data
    const cameraIds = Array.from(this.trafficDataCache.keys());
    
    if (cameraIds.length === 0) {
      // No cameras in cache, notify subscribers with random camera IDs
      console.log('⚠️ No cameras in cache, skipping random data generation');
      return;
    }

    cameraIds.forEach(cameraId => {
      const carCount = Math.floor(Math.random() * 30);
      const motorcycleCount = Math.floor(Math.random() * 20);
      const busCount = Math.floor(Math.random() * 5);
      const truckCount = Math.floor(Math.random() * 5);
      
      const randomTraffic: TrafficMetricsDTO = {
        id: Date.now(),
        cameraId,
        cameraName: cameraId,
        totalCount: carCount + motorcycleCount + busCount + truckCount,
        detectionDetails: {
          car: carCount,
          motorcycle: motorcycleCount,
          bus: busCount,
          truck: truckCount,
        },
        timestamp: new Date().toISOString(),
        district: 'Unknown',
        annotatedImageUrl: '',
        coordinates: [0, 0]
      };
      
      this.trafficDataCache.set(cameraId, randomTraffic);
      this.subscribers.forEach(callback => callback(randomTraffic));
    });
  }

  /**
   * Stop fallback mode
   */
  private stopFallbackMode() {
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
    this.useFallback = false;
  }

  /**
   * Subscribe to real-time traffic updates
   * @param callback - Function to call when new traffic data arrives
   * @returns Unsubscribe function
   */
  subscribe(callback: TrafficUpdateCallback): () => void {
    this.subscribers.add(callback);
    
    // Initialize WebSocket if this is the first subscriber
    if (this.subscribers.size === 1 && !this.isConnected && !this.isConnecting) {
      this.initWebSocket();
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
      
      // Cleanup if no more subscribers
      if (this.subscribers.size === 0) {
        this.cleanup();
      }
    };
  }

  /**
   * Get cached traffic data for a specific camera
   */
  getCachedData(cameraId: string): TrafficMetricsDTO | undefined {
    return this.trafficDataCache.get(cameraId);
  }

  /**
   * Get all cached traffic data
   */
  getAllCachedData(): TrafficMetricsDTO[] {
    return Array.from(this.trafficDataCache.values());
  }

  /**
   * Pre-populate cache with camera IDs
   * This allows random data generation to work even when real API is unavailable
   */
  initializeCameraIds(cameraIds: string[]): void {
    cameraIds.forEach(id => {
      if (!this.trafficDataCache.has(id)) {
        // Create minimal entry so random data generation knows about this camera
        this.trafficDataCache.set(id, {
          id: Date.now(),
          cameraId: id,
          cameraName: id,
          totalCount: 0,
          detectionDetails: {},
          timestamp: new Date().toISOString(),
          district: 'Unknown',
          annotatedImageUrl: '',
          coordinates: [0, 0]
        });
      }
    });
    console.log('✅ Cache pre-initialized with', cameraIds.length, 'camera IDs');
  }

  /**
   * Check if WebSocket is connected
   */
  isWebSocketConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Cleanup connections
   */
  private cleanup() {
    this.stopFallbackMode();
    
    if (this.stompClient) {
      this.stompClient.deactivate();
      this.stompClient = null;
    }
    
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
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
