// lib/api/config.ts

/**
 * API Configuration
 * Central configuration for all API endpoints and WebSocket connections
 */

export const API_CONFIG = {
  BASE_URL: 'http://localhost:6677',
  WS_URL: 'http://localhost:6677/ws',
  
  ENDPOINTS: {
    TRAFFIC: {
      LATEST: '/api/traffic/latest',
      SUMMARY_BY_DISTRICT: '/api/traffic/summary/by-district',
      BY_DATE: '/api/traffic/by-date',
      HOURLY_SUMMARY: '/api/traffic/hourly-summary',
      CAMERA_LATEST: '/api/traffic/camera',
    },
  },
  
  WS_TOPIC: '/topic/traffic',
  
  DEFAULT_TIMEOUT: 10000,
  MAX_RECONNECT_ATTEMPTS: 10,
  RECONNECT_DELAY: 5000,
};

/**
 * Get base URL based on environment
 * Allows for production override via environment variable
 */
export const getBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return API_CONFIG.BASE_URL;
  }
  
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction 
    ? process.env.NEXT_PUBLIC_API_URL || API_CONFIG.BASE_URL 
    : API_CONFIG.BASE_URL;
};

/**
 * Get WebSocket URL based on environment
 */
export const getWsUrl = (): string => {
  if (typeof window === 'undefined') {
    return API_CONFIG.WS_URL;
  }
  
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction 
    ? process.env.NEXT_PUBLIC_WS_URL || API_CONFIG.WS_URL 
    : API_CONFIG.WS_URL;
};
