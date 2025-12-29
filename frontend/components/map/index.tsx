// src/components/map/index.tsx

"use client"

import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import { LatLngExpression, LatLngTuple } from 'leaflet';
import L from 'leaflet';
import CameraMarkers from "@/components/camera-markers";
import RoutingManager from "@/components/routing";
import { API_CONFIG } from "@/lib/api/config";
import type { Camera } from "@/types/camera";
import { FiNavigation } from "react-icons/fi";

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
    isReportOpen?: boolean;
    onOpenReport?: () => void;
    isModalOpen?: boolean;
}

const defaults = {
    zoom: 19,
}

// Component to update map center when location changes
// keepZoom: when true, only updates center and preserves current zoom level
function ChangeMapView({ center, zoom, keepZoom = false }: { center: LatLngExpression, zoom: number, keepZoom?: boolean }) {
    const map = useMap();
    const prevCenterRef = useRef<LatLngExpression | null>(null);
    const prevZoomRef = useRef<number | null>(null);
    const isFirstRender = useRef(true);

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
        if (centerChanged || zoomChanged) {
            // On first render, use the provided zoom
            // After that, keep current zoom if keepZoom is true and only center changed
            const targetZoom = (isFirstRender.current || !keepZoom || zoomChanged) 
                ? zoom 
                : map.getZoom();
            
            // Use flyTo for smooth animation
            map.flyTo(center, targetZoom, {
                duration: 0.8, // Animation duration in seconds
                easeLinearity: 0.25
            });
            
            isFirstRender.current = false;
        }

        // Update refs
        prevCenterRef.current = center;
        prevZoomRef.current = zoom;
    }, [center, zoom, map, keepZoom]);

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
    const { zoom = defaults.zoom, posix, locationName, onCameraClick, selectedCamera, selectedLocation, isDrawerOpen, onOpenDrawer, isReportOpen, onOpenReport, isModalOpen } = props
    const [heatEnabled, setHeatEnabled] = useState<boolean>(false);
    const [routingEnabled, setRoutingEnabled] = useState<boolean>(false);
    const [cameras, setCameras] = useState<any[]>([]);
    const [routingCameraClickHandler, setRoutingCameraClickHandler] = useState<((camera: any) => void) | null>(null);
    const [activeRouteCoordinates, setActiveRouteCoordinates] = useState<number[][] | null>(null);
    const [routingState, setRoutingState] = useState<'selecting' | 'viewing' | 'idle'>('idle');

    // Handle camera selection from Report Dialog
    const handleReportCameraSelect = useCallback((cameraId: string) => {
        // Check both id and _id to match camera data structure
        const camera = cameras.find(c => c.id === cameraId || c._id === cameraId);
        if (camera && onCameraClick) {
            onCameraClick(camera);
        }
    }, [cameras, onCameraClick]);

    // Memoized camera update handler
    const handleCamerasUpdate = useCallback((updatedCameras: any[]) => {
        setCameras(updatedCameras);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            require('leaflet-defaulticon-compatibility');
        }
    }, []);

    // Calculate right offset based on open drawers
    // CityStatsDrawer is w-160 (640px) + 16px margin = 656px
    // ReportDialog is w-[500px] + 16px margin = 516px
    const rightOffset = isDrawerOpen ? 656 : (isReportOpen ? 516 : 16);

    return (
        <MapContainer
            center={posix}
            zoom={zoom}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            // Performance optimizations for smoother map interactions
            preferCanvas={true}
        >
            <ZoomControl position="bottomright" />
            <ChangeMapView center={posix} zoom={zoom} keepZoom={true} />
            <TileLayer
                url={API_CONFIG.OPENSTREETMAP_TILE_URL}
                // Tile layer performance optimizations
                keepBuffer={4}
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
                onCamerasUpdate={handleCamerasUpdate}
                routingMode={routingEnabled}
                routingState={routingState}
                onRoutingCameraClick={routingCameraClickHandler}
                heatEnabled={heatEnabled}
                routeCoordinates={activeRouteCoordinates}
            />

            <div className="absolute top-4 right-4 z-[1000] pointer-events-auto transition-all duration-300 ease-in-out">
                <div className="flex items-center gap-2">
                    <div className="bg-white rounded-lg shadow p-2 text-sm flex items-center gap-2">
                        <label className="flex items-center gap-2 select-none cursor-pointer">
                            <input type="checkbox" checked={heatEnabled} onChange={(e) => setHeatEnabled(e.target.checked)} />
                            <span className="text-red-500 font-medium">Heatmap</span>
                        </label>
                    </div>

                    <button
                        onClick={() => {
                            const newState = !routingEnabled;
                            setRoutingEnabled(newState);
                            if (newState) {
                                // Set initial state to 'selecting' when routing is enabled
                                setRoutingState('selecting');
                            } else {
                                setActiveRouteCoordinates(null);
                                setRoutingState('idle');
                            }
                        }}
                        className={`p-2 rounded-lg shadow transition-colors ${routingEnabled ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        title="Toggle Routing Mode"
                    >
                        <FiNavigation size={18} />
                    </button>
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
                    onCancel={() => {
                        setRoutingEnabled(false);
                        setActiveRouteCoordinates(null);
                        setRoutingState('idle');
                    }}
                    onSetCameraClickHandler={setRoutingCameraClickHandler}
                    onRouteChange={setActiveRouteCoordinates}
                    onRoutingStateChange={setRoutingState}
                />
            )}

        </MapContainer>
    )
}

export default Map

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