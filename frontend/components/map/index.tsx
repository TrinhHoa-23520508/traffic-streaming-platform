// src/components/map/index.tsx

"use client"

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import { LatLngExpression, LatLngTuple } from 'leaflet';
import L from 'leaflet';
import CameraMarkers from "@/components/camera-markers";
import type { Camera } from "@/types/camera";

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
}

const defaults = {
    zoom: 19,
}

// Component to update map center when location changes
function ChangeMapView({ center, zoom }: { center: LatLngExpression, zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
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
    const { zoom = defaults.zoom, posix, locationName, onCameraClick, selectedCamera, selectedLocation } = props
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
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

            {/* Heatmap toggle UI */}
            <div className="absolute top-4 right-4 z-[1000] pointer-events-auto">
                <div className="bg-white rounded-lg shadow p-2 text-sm flex items-center gap-2">
                    <label className="flex items-center gap-2 select-none">
                        <input type="checkbox" checked={heatEnabled} onChange={(e) => setHeatEnabled(e.target.checked)} />
                        <span className="text-red-500">Heatmap</span>
                    </label>
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
        console.log('🚗 Camera Density Update:', cameras.map((c: any) => ({
            id: c.id || c._id,
            name: c.name,
            density: c._randCount,
            coordinates: [c.loc.coordinates[1], c.loc.coordinates[0]]
        })));

    }, [cameras, imageRefreshKey]);

    // Create/remove heat layer when enabled changes or camera data changes
    useEffect(() => {
        let heat: any = heatLayerRef.current;

        const update = async () => {
            // dynamic import to avoid SSR issues
            // @ts-ignore: no types for leaflet.heat
            await import('leaflet.heat');

            // build points with [lat, lon, weight] using cameras from props
            const points = cameras.map((c: any) => {
                const lat = c.loc.coordinates[1];
                const lon = c.loc.coordinates[0];
                // normalize weight between 0 and 1 - spread out more evenly
                const weight = (c._randCount) / 100;
                const zoomLevel = map.getZoom();

                // Zoom-to-factor lookup table: higher zoom (zoomed in) = smaller factor, lower zoom (zoomed out) = larger factor
                const zoomFactorTable: Record<number, number> = {
                    10: 4.0,
                    11: 3.5,
                    12: 3.0,
                    13: 2.5,
                    14: 5.0,
                    15: 4.5,
                    16: 3.2,
                    17: 1.5,
                    18: 1.0,
                };

                // Get factor from table or interpolate
                const zoomFactor = zoomFactorTable[zoomLevel] ?? 1;
                return [lat, lon, weight * (18 - zoomLevel + 1)];
            });
            
            // Use larger radius and prevent fading on zoom out
            const radius = 60;
            const blur = 40;

            // gradient: green (low) -> yellow -> red (high)
            const gradient = {
                0.0: 'green',
                0.25: '#7fff00',
                0.5: 'yellow',
                0.75: 'orange',
                1.0: 'red'
            };

            if (enabled) {
                if (!heat) {
                    heat = (L as any).heatLayer(points, { 
                        radius, 
                        blur, 
                        max: 1.0,
                        minOpacity: 0.1,  
                        gradient 
                    });
                    heat.addTo(map as any);
                    heatLayerRef.current = heat;
                } else {
                    // Just update points, don't recreate layer
                    heat.setLatLngs(points);
                }
            } else {
                if (heat) {
                    try { map.removeLayer(heat); } catch (e) { }
                    heatLayerRef.current = null;
                }
            }
        };

        // Don't recreate on zoom, leaflet.heat handles zoom automatically
        // Only update when enabled/disabled or data changes

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
            if (heatLayerRef.current) {
                try { map.removeLayer(heatLayerRef.current); } catch (e) { }
                heatLayerRef.current = null;
            }
        };
    }, [enabled, cameras, map, zoomLevel]);

    return null;
}