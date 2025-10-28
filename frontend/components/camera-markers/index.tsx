// component/camera-markers/index.tsx
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import { icon } from 'leaflet';
import type { Camera } from '@/types/camera';

interface CameraMarkersProps {
    onCameraClick?: (camera: Camera) => void;
    selectedCameraId?: string;
    onCamerasUpdate?: (cameras: any[]) => void;
}

// Custom camera icon
const createCameraIcon = () => icon({
    iconUrl: '/media/camera.png',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
});

// Custom camera icon for selected camera
const createSelectedCameraIcon = () => icon({
    iconUrl: '/media/camera_clicked.png',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
});

const getClusterDistance = (zoom: number) => {
    if (zoom >= 14) return 0;
    if (zoom >= 12) return 450;
    if (zoom >= 10) return 900;
    return 1400;
};

export default function CameraMarkers({ onCameraClick, selectedCameraId, onCamerasUpdate }: CameraMarkersProps) {
    const [visibleCameras, setVisibleCameras] = useState<Camera[]>([]);
    const [loading, setLoading] = useState(true);
    const map = useMap();
    const camerasRef = useRef<Camera[]>([]);

    const updateVisibleMarkers = useCallback(() => {
        if (!map) return;
        if (camerasRef.current.length === 0) {
            setVisibleCameras([]);
            return;
        }

        const bounds = map.getBounds();
        const zoom = map.getZoom();

        const inBounds = camerasRef.current.filter((camera) =>
            bounds.contains([camera.loc.coordinates[1], camera.loc.coordinates[0]])
        );

        if (inBounds.length === 0) {
            setVisibleCameras([]);
            return;
        }

        const clusterDistance = getClusterDistance(zoom);

        if (clusterDistance === 0) {
            setVisibleCameras(inBounds);
            return;
        }

        const sorted = [...inBounds].sort((a, b) => {
            const keyA = a._id ?? (a as any).id ?? `${a.loc.coordinates[1]}:${a.loc.coordinates[0]}`;
            const keyB = b._id ?? (b as any).id ?? `${b.loc.coordinates[1]}:${b.loc.coordinates[0]}`;
            return keyA.localeCompare(keyB);
        });

        const clustered: Camera[] = [];

        sorted.forEach((camera) => {
            const position: [number, number] = [camera.loc.coordinates[1], camera.loc.coordinates[0]];
            const nearby = clustered.some((existing) =>
                map.distance(position, [existing.loc.coordinates[1], existing.loc.coordinates[0]]) <= clusterDistance
            );

            if (!nearby) {
                clustered.push(camera);
            }
        });

        setVisibleCameras(clustered);
    }, [map]);

    // Load camera data once
    useEffect(() => {
        const loadCameras = async () => {
            try {
                const response = await fetch('/camera_api.json');
                const data: Camera[] = await response.json();
                // attach randomized vehicle counts for testing
                const withCounts = data.map(d => ({ ...d, _randCount: Math.floor(Math.random() * 101) }));
                camerasRef.current = withCounts as any;
                setLoading(false);
                // Notify parent component of camera data
                if (onCamerasUpdate) onCamerasUpdate(withCounts);
                updateVisibleMarkers();
            } catch (error) {
                console.error('Error loading cameras:', error);
                setLoading(false);
            }
        };

        loadCameras();
    }, [onCamerasUpdate, updateVisibleMarkers]);

    // Refresh random counts every 20s for testing (simulate backend updates)
    useEffect(() => {
        const id = setInterval(() => {
            camerasRef.current = camerasRef.current.map(c => ({ ...c, _randCount: Math.floor(Math.random() * 101) }));
            // Notify parent component of updated camera data
            if (onCamerasUpdate) onCamerasUpdate([...camerasRef.current]);
            updateVisibleMarkers();
        }, 20000);
        return () => clearInterval(id);
    }, [onCamerasUpdate, updateVisibleMarkers]); // Empty deps - onCamerasUpdate is stable enough, no need to restart interval

    useEffect(() => {
        if (!map) return;

        const handleMapChange = () => {
            updateVisibleMarkers();
        };

        map.on('moveend', handleMapChange);
        map.on('zoomend', handleMapChange);

        handleMapChange();

        return () => {
            map.off('moveend', handleMapChange);
            map.off('zoomend', handleMapChange);
        };
    }, [map, updateVisibleMarkers]);

    // Memoize camera icon to avoid recreation
    const cameraIcon = useMemo(() => createCameraIcon(), []);
    const selectedCameraIcon = useMemo(() => createSelectedCameraIcon(), []);

    if (loading) {
        return null;
    }

    return (
        <>
            {visibleCameras.map((camera) => {
                // GeoJSON uses [longitude, latitude], Leaflet uses [latitude, longitude]
                const position: [number, number] = [
                    camera.loc.coordinates[1],
                    camera.loc.coordinates[0]
                ];

                const isSelected = camera._id === selectedCameraId;

                return (
                    <Marker
                        key={camera._id}
                        position={position}
                        icon={isSelected ? selectedCameraIcon : cameraIcon}
                        eventHandlers={{
                            click: () => {
                                if (onCameraClick) {
                                    onCameraClick(camera);
                                }
                            }
                        }}
                    />
                );
            })}
        </>
    );
}
