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

const Map = (props: MapProps) => {
    const { zoom = defaults.zoom, posix, locationName, onCameraClick, selectedCamera, selectedLocation } = props
    const [heatEnabled, setHeatEnabled] = useState<boolean>(false);

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
            <CameraMarkers onCameraClick={onCameraClick} selectedCameraId={selectedCamera?._id} />

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
                <HeatLayerManager enabled={heatEnabled} imageRefreshKey={(props as any).imageRefreshKey} />
            )}
        </MapContainer>
    )
}

export default Map

// HeatLayerManager component: client-only, creates a heat layer using leaflet.heat
function HeatLayerManager({ enabled, imageRefreshKey }: { enabled: boolean, imageRefreshKey?: number }) {
    const map = useMap();
    const heatLayerRef = useRef<any | null>(null);
    const camerasRef = useRef<any[]>([]);

    // Load cameras once
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch('/camera_api.json');
                const data = await res.json();
                if (!mounted) return;
                camerasRef.current = data;
            } catch (err) {
                console.error('Failed to load cameras for heatmap', err);
            }
        })();
        return () => { mounted = false };
    }, []);

    // Update randomized vehicle counts whenever imageRefreshKey changes or on interval
    useEffect(() => {
        if (camerasRef.current.length === 0) return;

        // assign randomized counts 0-100
        const assignRandomCounts = () => {
            camerasRef.current = camerasRef.current.map((c: any) => ({ ...c, _randCount: Math.floor(Math.random() * 101) }));
            // if heat layer exists, update its points
            if (heatLayerRef.current) {
                const points = camerasRef.current.map((c: any) => [c.loc.coordinates[1], c.loc.coordinates[0], (c._randCount ?? 0) / 100]);
                try { heatLayerRef.current.setLatLngs(points); } catch (e) { /* ignore */ }
            }
        };

        assignRandomCounts();
        const id = setInterval(assignRandomCounts, 20000);
        return () => clearInterval(id);
    }, [imageRefreshKey]);

    // Create/remove heat layer when enabled changes or camera data changes
    useEffect(() => {
        let heat: any = heatLayerRef.current;

        const update = async () => {
            // dynamic import to avoid SSR issues
            // @ts-ignore: no types for leaflet.heat
            await import('leaflet.heat');

            // build points with [lat, lon, weight]
            const points = camerasRef.current.map((c: any) => {
                const lat = c.loc.coordinates[1];
                const lon = c.loc.coordinates[0];
                // normalize weight between 0 and 1
                const weight = (c._randCount ?? 0) / 100;
                return [lat, lon, weight];
            });
            // helper: compute radius based on zoom (larger radius when zoomed out)
            const getRadiusForZoom = (z: number) => {
                if (z <= 10) return 50;
                if (z <= 12) return 40;
                if (z <= 14) return 30;
                if (z <= 16) return 20;
                return 12;
            };

            const radius = getRadiusForZoom(map.getZoom());
            const blur = Math.max(10, Math.floor(radius / 2));

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
                    heat = (L as any).heatLayer(points, { radius, blur, maxZoom: 17, gradient });
                    heat.addTo(map as any);
                    heatLayerRef.current = heat;
                } else {
                    // if radius changed, recreate layer to apply new radius/blur
                    try {
                        const currentRadius = (heat && heat._radius) || null;
                        if (currentRadius !== radius) {
                            map.removeLayer(heat);
                            heat = (L as any).heatLayer(points, { radius, blur, maxZoom: 17, gradient });
                            heat.addTo(map as any);
                            heatLayerRef.current = heat;
                        } else {
                            heat.setLatLngs(points);
                        }
                    } catch (e) {
                        // fallback: recreate
                        try { map.removeLayer(heat); } catch (e) { }
                        heat = (L as any).heatLayer(points, { radius, blur, maxZoom: 17, gradient });
                        heat.addTo(map as any);
                        heatLayerRef.current = heat;
                    }
                }
            } else {
                if (heat) {
                    try { map.removeLayer(heat); } catch (e) { }
                    heatLayerRef.current = null;
                }
            }
        };

        // update heat layer when zoom changes so radius adapts
        const onZoom = () => {
            // trigger update to potentially recreate layer with new radius
            update().catch(() => { });
        };

        map.on('zoomend', onZoom);

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
            map.off('zoomend', onZoom);
            if (heatLayerRef.current) {
                try { map.removeLayer(heatLayerRef.current); } catch (e) { }
                heatLayerRef.current = null;
            }
        };
    }, [enabled, imageRefreshKey, map]);

    return null;
}