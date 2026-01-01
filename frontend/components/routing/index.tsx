// components/routing/index.tsx
"use client"

import { useCallback, useEffect, useRef, useState } from "react";
import { Marker, Polyline, useMap, useMapEvents } from "react-leaflet";
import L, { LatLngTuple } from "leaflet";
import { FiX, FiMapPin } from "react-icons/fi";
import { API_CONFIG } from "@/lib/api/config";
import { trafficApi } from "@/lib/api/trafficApi";
import type { TrafficMetricsDTO } from "@/types/traffic";

// ==================== TYPES ====================

interface RouteResult {
    coordinates: number[][]; // [lng, lat] format
    distance: number; // meters
    segmentDistances: number[]; // per-segment distances from OSRM annotations
}

interface TrafficRouteSegment {
    positions: LatLngTuple[];
    color: string;
    speedKmh: number;
}

interface RoutingManagerProps {
    cameras: any[];
    onCancel: () => void;
    onSetCameraClickHandler: (handler: ((camera: any) => void) | null) => void;
    onRouteChange?: (coordinates: number[][] | null) => void;
    onRoutingStateChange?: (state: 'selecting' | 'viewing' | 'idle') => void;
}

// ==================== CONSTANTS ====================

const BASE_SPEED_KMH = 25;
const CAMERA_INFLUENCE_RADIUS = 300; // meters

// ==================== UTILITY FUNCTIONS ====================

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const createMarkerIcon = (color: string) => L.divIcon({
    className: 'custom-routing-pin',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
});

// ==================== TRAFFIC DATA SERVICE ====================

interface CameraTrafficInfo {
    cameraId: string;
    lat: number;
    lng: number;
    currentCount: number;
    maxCount: number;
}

class TrafficDataService {
    private cameras: any[] = [];
    private trafficDataCache: Map<string, number> = new Map();
    private maxCountCache: Map<string, number> = new Map();
    private fetchingMaxCounts: Set<string> = new Set();

    setCameras(cameras: any[]) {
        this.cameras = cameras;
    }

    // Fetch max count for a specific camera (lazy loading)
    private async fetchMaxCountForCamera(cameraId: string): Promise<number> {
        if (this.maxCountCache.has(cameraId)) {
            return this.maxCountCache.get(cameraId)!;
        }
        
        if (this.fetchingMaxCounts.has(cameraId)) {
            // Already fetching, wait a bit and return default
            return 50;
        }
        
        this.fetchingMaxCounts.add(cameraId);
        
        try {
            const result = await trafficApi.getCameraMaxCount(cameraId);
            if (result) {
                this.maxCountCache.set(cameraId, result.maxVehicleCount);
                return result.maxVehicleCount;
            }
        } catch (error) {
            // Silent fail, use default
        } finally {
            this.fetchingMaxCounts.delete(cameraId);
        }
        
        return 50; // Default max count
    }

    // Pre-fetch max counts for cameras near a route (non-blocking)
    async prefetchMaxCountsForRoute(routeCoords: number[][]) {
        // Sample every 10th point to find nearby cameras
        const relevantCameraIds = new Set<string>();
        
        for (let i = 0; i < routeCoords.length; i += 10) {
            const [lng, lat] = routeCoords[i];
            
            this.cameras.forEach(cam => {
                const cameraId = cam.id || cam._id || cam.name;
                if (this.maxCountCache.has(cameraId)) return; // Skip if already cached
                
                const dist = haversineDistance(lat, lng, cam.loc.coordinates[1], cam.loc.coordinates[0]);
                if (dist < CAMERA_INFLUENCE_RADIUS) {
                    relevantCameraIds.add(cameraId);
                }
            });
        }
        
        // Fetch max counts for relevant cameras (fire and forget, non-blocking)
        const ids = Array.from(relevantCameraIds).slice(0, 20); // Limit to 20 cameras max
        if (ids.length > 0) {
            console.log(`📊 Pre-fetching max counts for ${ids.length} route cameras...`);
            Promise.allSettled(ids.map(id => this.fetchMaxCountForCamera(id)));
        }
    }

    updateTrafficData(data: TrafficMetricsDTO) {
        this.trafficDataCache.set(data.cameraId, data.totalCount);
    }

    getCameraTrafficInfo(): CameraTrafficInfo[] {
        return this.cameras.map(cam => {
            const cameraId = cam.id || cam._id || cam.name;
            return {
                cameraId,
                lat: cam.loc.coordinates[1],
                lng: cam.loc.coordinates[0],
                currentCount: this.trafficDataCache.get(cameraId) || cam.density || 0,
                maxCount: this.maxCountCache.get(cameraId) || 50
            };
        });
    }

    getTrafficRatioForPoint(lat: number, lng: number): { ratio: number; hasCamera: boolean } {
        const cameraInfos = this.getCameraTrafficInfo();
        
        const nearbyCameras = cameraInfos.filter(cam => {
            const dist = haversineDistance(lat, lng, cam.lat, cam.lng);
            return dist < CAMERA_INFLUENCE_RADIUS;
        });

        if (nearbyCameras.length === 0) {
            return { ratio: 0, hasCamera: false };
        }

        let totalWeight = 0;
        let weightedRatio = 0;
        
        nearbyCameras.forEach(cam => {
            const dist = Math.max(10, haversineDistance(lat, lng, cam.lat, cam.lng));
            const weight = 1 / dist;
            const ratio = cam.currentCount / Math.max(cam.maxCount, 1);
            
            weightedRatio += ratio * weight;
            totalWeight += weight;
        });

        const avgRatio = totalWeight > 0 ? weightedRatio / totalWeight : 0;
        return { ratio: Math.min(Math.max(avgRatio, 0), 0.95), hasCamera: true };
    }

    // Speed = 35 * (1 - p/pmax)
    calculateSpeed(trafficRatio: number): number {
        return Math.max(BASE_SPEED_KMH * (1 - trafficRatio), 5);
    }
}

const trafficDataService = new TrafficDataService();

// ==================== OSRM ROUTING ====================

async function fetchOSRMRoute(
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number
): Promise<RouteResult | null> {
    // Request annotations=distance to get per-segment distances
    const url = `${API_CONFIG.OSRM_API_URL}/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&annotations=distance`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            return null;
        }
        
        const route = data.routes[0];
        // OSRM returns per-segment distances in legs[].annotation.distance[]
        const segmentDistances = route.legs?.[0]?.annotation?.distance || [];
        
        return {
            coordinates: route.geometry.coordinates,
            distance: route.distance,
            segmentDistances
        };
    } catch (error) {
        console.error('❌ OSRM routing failed:', error);
        return null;
    }
}

// ==================== ROUTE PROCESSING ====================

interface ProcessedRoute {
    segments: TrafficRouteSegment[];
    totalDistance: number;
    estimatedDuration: number;
}

function processRouteWithTraffic(coordinates: number[][], distance: number, segmentDistances: number[]): ProcessedRoute {
    const segments: TrafficRouteSegment[] = [];
    let totalDuration = 0;
    
    for (let i = 0; i < coordinates.length - 1; i++) {
        const [lng1, lat1] = coordinates[i];
        const [lng2, lat2] = coordinates[i + 1];
        
        // Use OSRM's accurate segment distance, fallback to haversine if not available
        const segmentDistance = segmentDistances[i] ?? haversineDistance(lat1, lng1, lat2, lng2);
        const midLat = (lat1 + lat2) / 2;
        const midLng = (lng1 + lng2) / 2;
        
        const { ratio, hasCamera } = trafficDataService.getTrafficRatioForPoint(midLat, midLng);
        const speedKmh = trafficDataService.calculateSpeed(ratio);
        const speedMs = speedKmh / 3.6;
        
        totalDuration += segmentDistance / speedMs;
        
        let color = '#3b82f6'; // Blue - no data
        if (hasCamera) {
            if (ratio > 0.75) color = '#ef4444'; // Red
            else if (ratio > 0.5) color = '#f97316'; // Orange
            else if (ratio > 0.25) color = '#eab308'; // Yellow
            else color = '#22c55e'; // Green
        }
        
        if (segments.length > 0 && segments[segments.length - 1].color === color) {
            segments[segments.length - 1].positions.push([lat2, lng2] as LatLngTuple);
        } else {
            segments.push({
                positions: [[lat1, lng1] as LatLngTuple, [lat2, lng2] as LatLngTuple],
                color,
                speedKmh
            });
        }
    }
    
    return { segments, totalDistance: distance, estimatedDuration: totalDuration };
}

// ==================== MAIN COMPONENT ====================

export default function RoutingManager({ 
    cameras, 
    onCancel, 
    onSetCameraClickHandler, 
    onRouteChange,
    onRoutingStateChange 
}: RoutingManagerProps) {
    const map = useMap();
    
    const [startPoint, setStartPoint] = useState<L.LatLng | null>(null);
    const [endPoint, setEndPoint] = useState<L.LatLng | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const [route, setRoute] = useState<{
        segments: TrafficRouteSegment[];
        distance: number;
        duration: number;
    } | null>(null);
    
    const unsubscribeRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        trafficDataService.setCameras(cameras);
    }, [cameras]);

    useEffect(() => {
        const unsubscribe = trafficApi.subscribe((data) => {
            trafficDataService.updateTrafficData(data);
        });
        unsubscribeRef.current = unsubscribe;
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (onRoutingStateChange) {
            if (route) {
                onRoutingStateChange('viewing');
            } else {
                // Always 'selecting' when routing is enabled but no route yet
                onRoutingStateChange('selecting');
            }
        }
    }, [startPoint, endPoint, route, onRoutingStateChange]);

    const calculateRoute = useCallback(async (start: L.LatLng, end: L.LatLng) => {
        setLoading(true);
        setError(null);
        setRoute(null);
        
        console.log('🚀 Calculating route from', start, 'to', end);
        
        try {
            const osrmResult = await fetchOSRMRoute(start.lat, start.lng, end.lat, end.lng);
            
            if (!osrmResult) {
                setError('Could not find a route. Try different points.');
                return;
            }
            
            // Pre-fetch max counts for cameras near the route (non-blocking)
            trafficDataService.prefetchMaxCountsForRoute(osrmResult.coordinates);
            
            const processed = processRouteWithTraffic(osrmResult.coordinates, osrmResult.distance, osrmResult.segmentDistances);
            
            setRoute({
                segments: processed.segments,
                distance: processed.totalDistance,
                duration: processed.estimatedDuration
            });
            
            console.log(`📍 Route: ${(processed.totalDistance/1000).toFixed(2)}km, ~${Math.round(processed.estimatedDuration/60)} min`);
            
            const bounds = L.latLngBounds([start, end]);
            osrmResult.coordinates.forEach(([lng, lat]) => bounds.extend([lat, lng]));
            map.fitBounds(bounds, { padding: [50, 50] });
            
        } catch (err) {
            console.error('❌ Route calculation error:', err);
            setError('Failed to calculate route. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [map]);

    useEffect(() => {
        const handleCameraClick = (camera: any) => {
            const cameraLatLng = L.latLng(camera.loc.coordinates[1], camera.loc.coordinates[0]);
            console.log('📍 Camera clicked for routing:', camera.name || camera.id);
            
            if (!startPoint) {
                console.log('   → Setting as START point');
                setStartPoint(cameraLatLng);
            } else if (!endPoint) {
                console.log('   → Setting as END point');
                setEndPoint(cameraLatLng);
                calculateRoute(startPoint, cameraLatLng);
            }
        };
        
        // Wrap in arrow function to prevent React from calling it as functional update
        onSetCameraClickHandler(() => handleCameraClick);
        return () => onSetCameraClickHandler(null);
    }, [startPoint, endPoint, calculateRoute, onSetCameraClickHandler]);

    useMapEvents({
        click(e) {
            if (!startPoint) {
                setStartPoint(e.latlng);
            } else if (!endPoint) {
                setEndPoint(e.latlng);
                calculateRoute(startPoint, e.latlng);
            }
        }
    });

    useEffect(() => {
        if (onRouteChange) {
            if (route) {
                const coords: number[][] = [];
                route.segments.forEach(seg => {
                    seg.positions.forEach(pos => {
                        coords.push([pos[1], pos[0]]);
                    });
                });
                onRouteChange(coords);
            } else {
                onRouteChange(null);
            }
        }
    }, [route, onRouteChange]);

    const reset = useCallback(() => {
        setStartPoint(null);
        setEndPoint(null);
        setRoute(null);
        setError(null);
        if (onRouteChange) onRouteChange(null);
    }, [onRouteChange]);

    return (
        <>
            {/* Control Panel */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000] pointer-events-auto">
                {!endPoint ? (
                    <div className="bg-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4">
                        <div className="text-sm font-medium">
                            {!startPoint ? "🗺️ Click map or camera to set Start" : "🎯 Click map or camera to set Destination"}
                        </div>
                        {startPoint && (
                            <button onClick={reset} className="text-gray-500 hover:text-gray-700 text-sm">
                                Reset
                            </button>
                        )}
                        <button onClick={onCancel} className="text-red-500 hover:text-red-700">
                            <FiX size={18} />
                        </button>
                    </div>
                ) : loading ? (
                    <div className="bg-white px-4 py-3 rounded-lg shadow-lg">
                        <div className="text-sm font-medium">🔍 Finding route...</div>
                    </div>
                ) : error ? (
                    <div className="bg-white px-4 py-3 rounded-lg shadow-lg">
                        <div className="text-sm font-medium text-red-600">{error}</div>
                        <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Try again</button>
                    </div>
                ) : route && (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-600">ROUTE INFO</span>
                            <div className="flex gap-2">
                                <button onClick={reset} className="text-gray-500 hover:text-gray-700 text-xs">
                                    Reset
                                </button>
                                <button onClick={onCancel} className="text-red-500 hover:text-red-700">
                                    <FiX size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="p-4">
                            <RouteCard distance={route.distance} duration={route.duration} />
                        </div>
                        <div className="px-4 pb-3 flex items-center justify-center gap-3 text-[10px]">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500"></span>Clear</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500"></span>Light</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500"></span>Moderate</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span>Heavy</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span>No data</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Markers */}
            {startPoint && <Marker position={startPoint} icon={createMarkerIcon('#22c55e')} />}
            {endPoint && <Marker position={endPoint} icon={createMarkerIcon('#ef4444')} />}

            {/* Route Polylines */}
            {route && route.segments.map((segment, idx) => (
                <Polyline
                    key={`route-${idx}`}
                    positions={segment.positions}
                    pathOptions={{
                        color: segment.color,
                        weight: 6,
                        opacity: 0.9,
                        lineCap: 'round',
                        lineJoin: 'round'
                    }}
                />
            ))}
        </>
    );
}

// ==================== ROUTE CARD ====================

interface RouteCardProps {
    distance: number;
    duration: number;
}

function RouteCard({ distance, duration }: RouteCardProps) {
    const distanceKm = (distance / 1000).toFixed(2);
    const durationMin = Math.max(1, Math.round(duration / 60));
    
    const freeFlowDuration = distance / (BASE_SPEED_KMH / 3.6);
    const freeFlowMin = Math.max(1, Math.round(freeFlowDuration / 60));
    const delayMins = durationMin - freeFlowMin;

    return (
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <FiMapPin size={20} />
                </div>
                <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Distance</div>
                    <div className="text-xl font-bold text-gray-800">
                        {distanceKm} <span className="text-xs font-normal text-gray-500">km</span>
                    </div>
                </div>
            </div>
            
            <div className="h-10 w-px bg-gray-200"></div>
            
            <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">Est. Duration</div>
                <div className="text-xl font-bold text-green-700">
                    {durationMin} <span className="text-xs font-normal text-gray-500">min</span>
                </div>
                {delayMins > 0 ? (
                    <div className="text-[10px] text-orange-600 font-medium">
                        +{delayMins} min due to traffic
                    </div>
                ) : (
                    <div className="text-[10px] text-green-600 font-medium">
                        Free flow conditions
                    </div>
                )}
            </div>
        </div>
    );
}

export type { RoutingManagerProps };
