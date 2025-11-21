// src/components/map/index.tsx

"use client"

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import { LatLngExpression, LatLngTuple } from 'leaflet';
import L from 'leaflet';
import CameraMarkers from "@/components/camera-markers";
import type { Camera } from "@/types/camera";
import { FiMenu } from "react-icons/fi";

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
    const [cameras, setCameras] = useState<any[]>([]);

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
            {selectedLocation && !selectedCamera && (
                <Marker position={posix} draggable={false}>
                    <Popup>{locationName || "Hey ! I study here"}</Popup>
                </Marker>
            )}

            {/* All camera markers */}
            <CameraMarkers 
                onCameraClick={onCameraClick} 
                selectedCameraId={selectedCamera?._id}
                onCamerasUpdate={setCameras}
            />

            <div
                className="absolute top-4 z-[1000] pointer-events-auto"
                style={{ right: isDrawerOpen ? 616 : 16 }}
            >
                <div className="flex items-center gap-2">
                    <div className="bg-white rounded-lg shadow p-2 text-sm flex items-center gap-2">
                        <label className="flex items-center gap-2 select-none">
                            <input type="checkbox" checked={heatEnabled} onChange={(e) => setHeatEnabled(e.target.checked)} />
                            <span className="text-red-500">Heatmap</span>
                        </label>
                    </div>

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