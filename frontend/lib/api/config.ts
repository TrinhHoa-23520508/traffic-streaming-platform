// lib/api/config.ts

/**
 * API Configuration
 * Central configuration for all API endpoints and WebSocket connections
 */

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6677',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:6677/ws',

  // External API URLs
  CAMERA_API_URL: process.env.NEXT_PUBLIC_CAMERA_API_URL || 'https://api.notis.vn/v4',
  OPENSTREETMAP_TILE_URL: process.env.NEXT_PUBLIC_OPENSTREETMAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  OVERPASS_API_URL: process.env.NEXT_PUBLIC_OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter',
  OSRM_API_URL: process.env.NEXT_PUBLIC_OSRM_API_URL || 'https://router.project-osrm.org',

  ENDPOINTS: {
    TRAFFIC: {
      LATEST: '/api/traffic/latest',
      SUMMARY_BY_DISTRICT: '/api/traffic/summary/by-district',
      BY_DATE: '/api/traffic/by-date',
      HOURLY_SUMMARY: '/api/traffic/hourly-summary',
      CAMERA_LATEST: '/api/traffic/camera',
      CAMERA_FLOW_RATE: '/api/traffic/camera', // /{cameraId}/flow-rate
      CAMERA_MAX_COUNT: '/api/traffic/camera', // /{cameraId}/max-count
      CAMERAS: '/api/traffic/cameras',
      DISTRICTS: '/api/traffic/districts',
    },
    REPORTS: {
      BASE: '/api/reports',
      DOWNLOAD: '/api/reports/download', // /{reportId}
    }
  },

  WS_TOPIC: '/topic/traffic',
  WS_CITY_STATS_TOPIC: '/topic/hourly-summary-by-district',

  DEFAULT_TIMEOUT: Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 10000,
  MAX_RECONNECT_ATTEMPTS: Number(process.env.NEXT_PUBLIC_MAX_RECONNECT_ATTEMPTS) || 10,
  RECONNECT_DELAY: Number(process.env.NEXT_PUBLIC_RECONNECT_DELAY) || 5000,
};

/**
 * Get base URL based on environment
 * Allows for production override via environment variable
 */
export const getBaseUrl = (): string => {
  return API_CONFIG.BASE_URL;
};

/**
 * Get WebSocket URL based on environment
 */
export const getWsUrl = (): string => {
  return API_CONFIG.WS_URL;
};

/**
 * Get Camera API URL
 */
export const getCameraApiUrl = (): string => {
  return API_CONFIG.CAMERA_API_URL;
};

/**
 * Get OpenStreetMap Tile URL
 */
export const getOpenStreetMapTileUrl = (): string => {
  return API_CONFIG.OPENSTREETMAP_TILE_URL;
};

/**
 * Get Overpass API URL
 */
export const getOverpassApiUrl = (): string => {
  return API_CONFIG.OVERPASS_API_URL;
};

/**
 * Get OSRM API URL
 */
export const getOsrmApiUrl = (): string => {
  return API_CONFIG.OSRM_API_URL;
};
