// src/components/map/index.tsx

"use client"

import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Polyline, useMapEvents } from "react-leaflet";
import { LatLngExpression, LatLngTuple } from 'leaflet';
import L from 'leaflet';
import CameraMarkers from "@/components/camera-markers";
import type { Camera } from "@/types/camera";
import { FiMenu, FiNavigation, FiX } from "react-icons/fi";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

interface MapProps {
    posix: LatLngExpression | LatLngTuple,
    zoom?: number,
    locationName?: string;
    onCameraClick?: (camera: Camera) => void;
    selectedCamera?: Camera | null;
    selectedLocation?: { lat: number, lon: number, name: string } | null;
    imageRefreshKey?: number;
    isDrawerOpen?: boolean;
    onOpenDrawer?: () => void;
    isModalOpen?: boolean;
}

const defaults = {
    zoom: 19,
}

// Component to update map center when location changes
function ChangeMapView({ center, zoom }: { center: LatLngExpression, zoom: number }) {
    const map = useMap();
    const prevCenterRef = useRef<LatLngExpression | null>(null);
    const prevZoomRef = useRef<number | null>(null);

    useEffect(() => {
        const centerArray = Array.isArray(center) ? center : [center.lat, center.lng];
        const prevCenterArray = prevCenterRef.current
            ? (Array.isArray(prevCenterRef.current) ? prevCenterRef.current : [prevCenterRef.current.lat, prevCenterRef.current.lng])
            : null;

        // Check if center actually changed
        const centerChanged = !prevCenterArray ||
            centerArray[0] !== prevCenterArray[0] ||
            centerArray[1] !== prevCenterArray[1];

        // Check if zoom actually changed
        const zoomChanged = prevZoomRef.current !== zoom;

        // Only update if something actually changed
        if (centerChanged && zoomChanged) {
            // Both changed - use setView
            map.setView(center, zoom);
        } else if (centerChanged) {
            // Only center changed - pan without zoom
            map.panTo(center);
        } else if (zoomChanged) {
            // Only zoom changed
            map.setZoom(zoom);
        }

        // Update refs
        prevCenterRef.current = center;
        prevZoomRef.current = zoom;
    }, [center, zoom, map]);

    return null;
}

function ZoomLogger() {
    const map = useMap();

    useEffect(() => {
        const handleZoom = () => {
            console.log('🗺️ Map zoom level:', map.getZoom());
        };

        map.on('zoomend', handleZoom);
        return () => {
            map.off('zoomend', handleZoom);
        };
    }, [map]);

    return null;
}

const Map = (props: MapProps) => {
    const { zoom = defaults.zoom, posix, locationName, onCameraClick, selectedCamera, selectedLocation, isDrawerOpen, onOpenDrawer, isModalOpen } = props
    const [heatEnabled, setHeatEnabled] = useState<boolean>(false);
    const [routingEnabled, setRoutingEnabled] = useState<boolean>(false);
    const [cameras, setCameras] = useState<any[]>([]);
    const [routingCameraClickHandler, setRoutingCameraClickHandler] = useState<((camera: any) => void) | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            require('leaflet-defaulticon-compatibility');
        }
    }, []);

    return (
        <MapContainer
            center={posix}
            zoom={zoom}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
        >
            <ZoomControl position="bottomright" />
            <ChangeMapView center={posix} zoom={zoom} />
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* User's selected location marker (default Leaflet icon) - Only show when location selected, not camera */}
            {selectedLocation && !selectedCamera && !heatEnabled && (
                <Marker position={posix} draggable={false}>
                    <Popup>{locationName || "Hey ! I study here"}</Popup>
                </Marker>
            )}

            {/* All camera markers */}
            <CameraMarkers
                onCameraClick={onCameraClick}
                selectedCameraId={selectedCamera?._id}
                onCamerasUpdate={setCameras}
                routingMode={routingEnabled}
                onRoutingCameraClick={routingCameraClickHandler}
                heatEnabled={heatEnabled}
            />

            <div
                className="absolute top-4 z-[1000] pointer-events-auto"
                style={{ right: isDrawerOpen ? 656 : 16 }}
            >
                <div className="flex items-center gap-2">
                    <div className="bg-white rounded-lg shadow p-2 text-sm flex items-center gap-2">
                        <label className="flex items-center gap-2 select-none cursor-pointer">
                            <input type="checkbox" checked={heatEnabled} onChange={(e) => setHeatEnabled(e.target.checked)} />
                            <span className="text-red-500 font-medium">Heatmap</span>
                        </label>
                    </div>

                    <button
                        onClick={() => setRoutingEnabled(!routingEnabled)}
                        className={`p-2 rounded-lg shadow transition-colors ${routingEnabled ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        title="Toggle Routing Mode"
                    >
                        <FiNavigation size={18} />
                    </button>

                    {!isDrawerOpen && !isModalOpen && (
                        <button
                            onClick={() => onOpenDrawer && onOpenDrawer()}
                            className="bg-white text-black p-2 rounded-full shadow hover:bg-gray-50 cursor-pointer"
                        >
                            <FiMenu size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Heat layer manager (client-only) */}
            {typeof window !== 'undefined' && (
                <HeatLayerManager enabled={heatEnabled} cameras={cameras} imageRefreshKey={(props as any).imageRefreshKey} />
            )}

            {/* Routing Manager */}
            {routingEnabled && (
                <RoutingManager 
                    cameras={cameras} 
                    onCancel={() => setRoutingEnabled(false)}
                    onSetCameraClickHandler={setRoutingCameraClickHandler}
                />
            )}
        </MapContainer>
    )
}

export default Map

// --- Routing Components ---

type RouteVariant = 'shortest' | 'fastest';

interface TrafficRouteSegment {
    positions: LatLngTuple[];
    color: string;
}

interface RouteAnalysis {
    id: number;
    segments: TrafficRouteSegment[];
    distance: number;
    duration: number;
    adjustedDuration: number;
    trafficScore: number;
    coordinates: number[][];
}

const TRAFFIC_DELAY_SCORE_CAP = 50;

const calculateTrafficDelayMultiplier = (trafficScore: number) => {
    const normalized = Math.min(Math.max(trafficScore, 0), TRAFFIC_DELAY_SCORE_CAP) / TRAFFIC_DELAY_SCORE_CAP;
    // Up to ~80% slowdown when traffic is extremely heavy
    return 1 + normalized * 0.8;
};

function RoutingManager({ cameras, onCancel, onSetCameraClickHandler }: { cameras: any[], onCancel: () => void, onSetCameraClickHandler: (handler: ((camera: any) => void) | null) => void }) {
    const [startPoint, setStartPoint] = useState<L.LatLng | null>(null);
    const [endPoint, setEndPoint] = useState<L.LatLng | null>(null);
    const [routeOptions, setRouteOptions] = useState<{ shortest?: RouteAnalysis, fastest?: RouteAnalysis }>({});
    const [focusedRouteType, setFocusedRouteType] = useState<RouteVariant | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const map = useMap();

    const fetchRoute = useCallback(async (start: L.LatLng, end: L.LatLng) => {
        console.log('🚀 Fetching route from:', start, 'to:', end);
        setLoading(true);
        setError(null);
        setRouteOptions({});
        setFocusedRouteType(null);
        try {
            // Request multiple alternative routes from OSRM
            // Using alternatives=true (returns up to 2 routes) instead of 5 to be more reliable with public demo server
            const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=true`;
            console.log('🌐 Fetching OSRM URL:', url);
            
            const response = await fetch(url);
            const data = await response.json();
            console.log('📦 OSRM Response:', data);

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                // Process all routes with traffic analysis
                const processedRoutes: RouteAnalysis[] = data.routes.map((route: any, index: number) => {
                    const coordinates = route.geometry.coordinates;
                    const segments = processTrafficRoute(coordinates, cameras);
                    const trafficScore = calculateRouteTrafficScore(coordinates, cameras);
                    const distance = route.distance; // meters
                    const duration = route.duration; // seconds
                    const adjustedDuration = duration * calculateTrafficDelayMultiplier(trafficScore);
                    
                    return {
                        id: index,
                        segments,
                        trafficScore,
                        distance,
                        duration,
                        adjustedDuration,
                        coordinates
                    };
                });

                // Identify variants
                // If only 1 route, it's both shortest and fastest
                const shortestRoute = processedRoutes.reduce<RouteAnalysis>((prev, curr) =>
                    curr.distance < prev.distance ? curr : prev
                , processedRoutes[0]);
                
                const fastestRoute = processedRoutes.reduce<RouteAnalysis>((prev, curr) =>
                    curr.adjustedDuration < prev.adjustedDuration ? curr : prev
                , processedRoutes[0]);

                setRouteOptions({
                    shortest: shortestRoute,
                    fastest: fastestRoute
                });

                const defaultFocus: RouteVariant = fastestRoute.id === shortestRoute.id ? 'shortest' : 'fastest';
                setFocusedRouteType(defaultFocus);

                console.log('🚗 Route Analysis:');
                processedRoutes.forEach((r: any, i: number) => {
                    console.log(`Route ${i + 1}: ${(r.distance/1000).toFixed(2)}km, ${(r.duration/60).toFixed(1)}min, Traffic: ${r.trafficScore.toFixed(1)}, ETA traffic ${(r.adjustedDuration/60).toFixed(1)}min${r.id === shortestRoute.id ? ' [SHORTEST]' : ''}${r.id === fastestRoute.id ? ' [FASTEST]' : ''}`);
                });
                
                // Fit bounds to show route
                const bounds = L.latLngBounds([start, end]);
                const focusRoute = fastestRoute.coordinates || data.routes[0].geometry.coordinates;
                focusRoute.forEach((coord: any) => bounds.extend([coord[1], coord[0]]));
                map.fitBounds(bounds, { padding: [50, 50] });
            } else {
                console.warn('⚠️ No routes found in OSRM response', data);
                setError(`No routes available. ${data.message || ''}`);
            }
        } catch (error) {
            console.error("❌ Error fetching route:", error);
            setError('Unable to fetch route. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [cameras, map]);

    // Set up camera click handler for routing mode
    useEffect(() => {
        const handleCameraClick = (camera: any) => {
            const cameraLatLng = L.latLng(camera.loc.coordinates[1], camera.loc.coordinates[0]);
            if (!startPoint) {
                setStartPoint(cameraLatLng);
            } else if (!endPoint) {
                setEndPoint(cameraLatLng);
                fetchRoute(startPoint, cameraLatLng);
            }
        };
        onSetCameraClickHandler(() => handleCameraClick);
        return () => {
            onSetCameraClickHandler(null);
        };
    }, [startPoint, endPoint, onSetCameraClickHandler, fetchRoute]);

    // Handle map clicks
    useMapEvents({
        click(e) {
            console.log('🗺️ Map clicked at:', e.latlng, 'startPoint:', startPoint, 'endPoint:', endPoint);
            if (!startPoint) {
                setStartPoint(e.latlng);
                console.log('✅ Start point set');
            } else if (!endPoint) {
                setEndPoint(e.latlng);
                console.log('✅ End point set, fetching route...');
                fetchRoute(startPoint, e.latlng);
            }
        }
    });

    const switchToRoute = (type: RouteVariant) => {
        if (routeOptions[type]) {
            setFocusedRouteType(type);
        }
    };

    const reset = () => {
        setStartPoint(null);
        setEndPoint(null);
        setRouteOptions({});
        setFocusedRouteType(null);
        setError(null);
    };

    const shortestRoute = routeOptions.shortest;
    const fastestRoute = routeOptions.fastest;
    const hasRoutes = Boolean(shortestRoute);
    const shouldRenderFastest = Boolean(fastestRoute && (!shortestRoute || fastestRoute.id !== shortestRoute.id));
    const derivedActiveType: RouteVariant | null = focusedRouteType
        ?? (fastestRoute && (!shortestRoute || fastestRoute.id !== shortestRoute.id)
            ? 'fastest'
            : shortestRoute
                ? 'shortest'
                : null);

    return (
        <>
            {/* Instructions / Controls */}
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
                        <div className="text-sm font-medium">🔍 Finding best routes...</div>
                    </div>
                ) : error ? (
                    <div className="bg-white px-4 py-3 rounded-lg shadow-lg">
                        <div className="text-sm font-medium text-red-600">{error}</div>
                        <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Try again</button>
                    </div>
                ) : hasRoutes && (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-600">ROUTE OPTIONS</span>
                            <div className="flex gap-2">
                                <button onClick={reset} className="text-gray-500 hover:text-gray-700 text-xs">
                                    Reset
                                </button>
                                <button onClick={onCancel} className="text-red-500 hover:text-red-700">
                                    <FiX size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 p-3">
                            {shortestRoute && (
                                <RouteCard
                                    type="shortest"
                                    route={shortestRoute}
                                    isActive={derivedActiveType === 'shortest'}
                                    onSelect={() => switchToRoute('shortest')}
                                    comparisonRoute={fastestRoute}
                                />
                            )}
                            {fastestRoute && (
                                <RouteCard
                                    type="fastest"
                                    route={fastestRoute}
                                    isActive={derivedActiveType === 'fastest'}
                                    onSelect={() => switchToRoute('fastest')}
                                    comparisonRoute={shortestRoute}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Start Marker */}
            {startPoint && (
                <Marker position={startPoint} icon={createIcon('green')} />
            )}

            {/* End Marker */}
            {endPoint && (
                <Marker position={endPoint} icon={createIcon('red')} />
            )}

            {/* Route Segments */}
            {renderRoutePolyline(shortestRoute, 'shortest', derivedActiveType)}
            {shouldRenderFastest && renderRoutePolyline(fastestRoute, 'fastest', derivedActiveType)}
        </>
    );
}

// Helper to create simple colored icons
const createIcon = (color: string) => L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

// Calculate overall traffic score for a route (lower is better)
function calculateRouteTrafficScore(coordinates: number[][], cameras: any[]): number {
    const path = coordinates.map(coord => L.latLng(coord[1], coord[0]));
    let totalScore = 0;
    let sampledPoints = 0;
    const SAMPLE_INTERVAL = 10; // Sample every 10th point for performance

    for (let i = 0; i < path.length; i += SAMPLE_INTERVAL) {
        const point = path[i];
        
        // Find nearest camera
        let nearestCamera = null;
        let minDistance = Infinity;

        cameras.forEach(camera => {
            const camLatLng = L.latLng(camera.loc.coordinates[1], camera.loc.coordinates[0]);
            const dist = point.distanceTo(camLatLng);
            if (dist < minDistance) {
                minDistance = dist;
                nearestCamera = camera;
            }
        });

        // Only count if camera is nearby (within 500m)
        if (nearestCamera && minDistance < 500) {
            const density = (nearestCamera as any).density || 0;
            // Weight by inverse distance (closer = more influence)
            const distanceWeight = 1 / (1 + minDistance / 100);
            totalScore += density * distanceWeight;
            sampledPoints++;
        }
    }

    // Return weighted average, or 0 if no traffic data
    return sampledPoints > 0 ? totalScore / sampledPoints : 0;
}

// Logic to split route and color based on traffic
function processTrafficRoute(coordinates: number[][], cameras: any[]): TrafficRouteSegment[] {
    const segments: TrafficRouteSegment[] = [];
    
    // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
    const path = coordinates.map(coord => L.latLng(coord[1], coord[0]));

    // We'll create small segments and check nearest camera for each
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i+1];
        const midPoint = L.latLng(
            (p1.lat + p2.lat) / 2,
            (p1.lng + p2.lng) / 2
        );

        // Find nearest camera
        let nearestCamera = null;
        let minDistance = Infinity;

        cameras.forEach(camera => {
            const camLatLng = L.latLng(camera.loc.coordinates[1], camera.loc.coordinates[0]);
            const dist = midPoint.distanceTo(camLatLng);
            if (dist < minDistance) {
                minDistance = dist;
                nearestCamera = camera;
            }
        });

        // Determine color
        let color = '#3b82f6'; // Default Blue (No data/Far)
        
        // Only apply traffic color if camera is within 500m
        if (nearestCamera && minDistance < 500) {
            const density = (nearestCamera as any).density || 0;
            if (density > 40) color = '#ef4444'; // Red - Heavy
            else if (density > 20) color = '#f97316'; // Orange - Moderate
            else if (density > 10) color = '#eab308'; // Yellow - Light
            else color = '#22c55e'; // Green - Clear
        }

        // Optimization: Merge with previous segment if color is same
        if (segments.length > 0 && segments[segments.length - 1].color === color) {
            segments[segments.length - 1].positions.push([p2.lat, p2.lng]);
        } else {
            segments.push({
                positions: [
                    [p1.lat, p1.lng],
                    [p2.lat, p2.lng]
                ],
                color: color
            });
        }
    }

    return segments;
}

// HeatLayerManager component: client-only, creates a heat layer using leaflet.heat
function HeatLayerManager({ enabled, cameras, imageRefreshKey }: { enabled: boolean, cameras: any[], imageRefreshKey?: number }) {
    const map = useMap();
    const heatLayerRef = useRef<any | null>(null);
    const [zoomLevel, setZoomLevel] = useState(() => map.getZoom());

    useEffect(() => {
        const handleZoom = () => {
            const nextZoom = map.getZoom();
            setZoomLevel(nextZoom);
        };

        map.on('zoomend', handleZoom);
        handleZoom();
        return () => {
            map.off('zoomend', handleZoom);
        };
    }, [map]);

    // Remove the old camera loading and random count generation - now using cameras from props
    // Update heat layer when cameras data changes
    useEffect(() => {
        if (cameras.length === 0) return;

        // Log camera densities when they update
        // console.log('🚗 Camera Density Update:', cameras.map((c: any) => ({
        //     id: c.id || c._id,
        //     name: c.name,
        //     density: c.density,
        //     coordinates: [c.loc.coordinates[1], c.loc.coordinates[0]]
        // })));

    }, [cameras, imageRefreshKey]);

    // Create/remove heat layer when enabled changes or camera data changes
    useEffect(() => {
        let heat: any = heatLayerRef.current;

        const update = async () => {
            // dynamic import to avoid SSR issues
            // @ts-ignore: no types for leaflet.heat
            await import('leaflet.heat');

            // Calculate max density to normalize or use a fixed scale
            // Using a fixed scale allows comparing traffic levels objectively
            // Assuming ~50 vehicles is "high traffic" for a single camera view
            const MAX_DENSITY_THRESHOLD = 50;

            // build points with [lat, lon, weight] using cameras from props
            const points = cameras.map((c: any) => {
                const lat = c.loc.coordinates[1];
                const lon = c.loc.coordinates[0];
                
                // Normalize weight: 0 to 1
                // We clamp it at 1.0 so extremely high traffic doesn't break the visual
                let weight = (c.density || 0) / MAX_DENSITY_THRESHOLD;
                if (weight > 1) weight = 1;
                if (weight < 0) weight = 0;
                
                return [lat, lon, weight];
            });

            // Dynamic configuration based on zoom
            const currentZoom = map.getZoom();
            
            // Adjust max intensity to prevent oversaturation when zooming out
            // When points overlap at low zoom, we need a higher threshold for "red"
            const baseZoom = 15;
            let dynamicMax = 1.0;
            if (currentZoom < baseZoom) {
                // Increase max intensity as we zoom out to compensate for point overlap
                dynamicMax = 1.0 + (baseZoom - currentZoom) * 0.8;
            }

            // Configuration for better visibility
            const options = {
                radius: 35, // Larger radius to cover more area and connect sparse points
                blur: 20,   // Smooth blur for better visual appeal
                maxZoom: currentZoom, // CRITICAL: Set maxZoom to current zoom to prevent fading when zooming out
                max: dynamicMax,   // Dynamic maximum intensity
                minOpacity: 0.3, // Ensure even low traffic is slightly visible
                gradient: {
                    0.0: 'blue',
                    0.2: 'cyan',
                    0.4: 'lime',
                    0.6: 'yellow',
                    0.8: 'orange',
                    1.0: 'red'
                }
            };

            if (enabled) {
                if (!heat) {
                    heat = (L as any).heatLayer(points, options);
                    heat.addTo(map as any);
                    heatLayerRef.current = heat;
                } else {
                    // Update points and options
                    heat.setLatLngs(points);
                    if (heat.setOptions) {
                        heat.setOptions(options);
                    }
                }
            } else {
                if (heat) {
                    try { map.removeLayer(heat); } catch (e) { }
                    heatLayerRef.current = null;
                }
            }
        };

        // Ensure global L is available
        if (typeof (window as any).L === 'undefined') {
            // try to require leaflet (should already be loaded)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            (window as any).L = require('leaflet');
        }

        update().catch(err => console.error('Failed to update heat layer', err));

        // cleanup
        return () => {
            // We don't remove the layer here to prevent flickering on re-renders
            // The layer is managed by the 'enabled' flag check above
        };
    }, [enabled, cameras, map, zoomLevel]); // Re-run when zoom changes to update maxZoom

    return null;
}

function renderRoutePolyline(route: RouteAnalysis | undefined, type: RouteVariant, focusedType: RouteVariant | null) {
    if (!route) return null;
    const isFocused = focusedType ? focusedType === type : type === 'fastest';

    return route.segments.map((segment, idx) => (
        <Polyline
            key={`${type}-${route.id}-${idx}`}
            positions={segment.positions}
            pathOptions={{
                color: segment.color,
                weight: isFocused ? 7 : 4,
                opacity: isFocused ? 0.95 : 0.45,
                dashArray: !isFocused && type === 'shortest' ? '8 8' : undefined,
                lineCap: 'round',
                lineJoin: 'round'
            }}
        />
    ));
}

interface RouteCardProps {
    type: RouteVariant;
    route: RouteAnalysis;
    isActive: boolean;
    onSelect: () => void;
    comparisonRoute?: RouteAnalysis;
}

function RouteCard({ type, route, isActive, onSelect, comparisonRoute }: RouteCardProps) {
    const icon = type === 'shortest' ? '📏' : '⚡';
    const title = type === 'shortest' ? 'Shortest Distance' : 'Fastest (Traffic)';
    const baseClasses = 'flex-1 min-w-[220px] p-3 rounded-lg border-2 text-left transition-all';
    const activeClasses = type === 'shortest' ? 'border-blue-500 bg-blue-50 shadow' : 'border-green-500 bg-green-50 shadow';
    const inactiveClasses = 'border-gray-200 bg-white hover:border-gray-300';
    const distanceKm = (route.distance / 1000).toFixed(2);
    const noTrafficMinutes = Math.max(1, Math.round(route.duration / 60));
    const trafficMinutes = Math.max(1, Math.round(route.adjustedDuration / 60));
    const trafficClass = route.trafficScore < 10 ? 'text-green-600' : route.trafficScore < 25 ? 'text-yellow-600' : 'text-red-600';
    const comparisonExists = comparisonRoute !== undefined;
    const isSameRoute = comparisonExists && comparisonRoute!.id === route.id;
    let comparisonText: string | null = null;

    if (comparisonExists) {
        if (isSameRoute) {
            comparisonText = 'Matches other route';
        } else {
            const distanceDeltaKm = (route.distance - comparisonRoute!.distance) / 1000;

            if (type === 'fastest') {
                const savedMinutes = Math.max(1, Math.round((comparisonRoute!.adjustedDuration - route.adjustedDuration) / 60));
                const distanceNote = distanceDeltaKm >= 0
                    ? `+${distanceDeltaKm.toFixed(2)} km`
                    : `${distanceDeltaKm.toFixed(2)} km`;
                comparisonText = `Saves ${savedMinutes} min, ${distanceNote}`;
            } else {
                const extraMinutes = Math.max(1, Math.round((route.adjustedDuration - comparisonRoute!.adjustedDuration) / 60));
                const distanceNote = distanceDeltaKm <= 0
                    ? `${Math.abs(distanceDeltaKm).toFixed(2)} km shorter`
                    : `+${distanceDeltaKm.toFixed(2)} km`;
                comparisonText = `+${extraMinutes} min, ${distanceNote}`;
            }
        }
    }

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
        >
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{icon}</span>
                <span className="font-semibold text-sm">{title}</span>
                {isActive && (
                    <span className={`ml-auto text-xs ${type === 'shortest' ? 'text-blue-600' : 'text-green-600'}`}>✓</span>
                )}
            </div>
            <div className="text-left space-y-1">
                <div className="text-xs text-gray-600">
                    Distance: <span className="font-medium text-gray-900">{distanceKm} km</span>
                </div>
                <div className="text-xs text-gray-600">
                    ETA (free-flow): <span className="font-medium text-gray-900">{noTrafficMinutes} min</span>
                </div>
                <div className="text-xs text-gray-600">
                    ETA (traffic): <span className={`font-semibold ${type === 'fastest' ? 'text-green-700' : 'text-gray-900'}`}>{trafficMinutes} min</span>
                </div>
                <div className="text-xs text-gray-600">
                    Traffic score: <span className={`font-medium ${trafficClass}`}>{route.trafficScore.toFixed(1)}</span>
                </div>
            </div>
            {comparisonText && (
                <div className="mt-2 text-xs text-gray-700 bg-gray-100 px-2 py-1 rounded">
                    {comparisonText}
                </div>
            )}
        </button>
    );
}