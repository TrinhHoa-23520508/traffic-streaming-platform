// component/camera-markers/index.tsx
"use client"

import { useEffect, useState, useMemo, useRef } from 'react';
import { Marker, useMap } from 'react-leaflet';
import { icon, LatLngBounds } from 'leaflet';
import type { Camera } from '@/types/camera';

interface CameraMarkersProps {
    onCameraClick?: (camera: Camera) => void;
    selectedCameraId?: string;
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

export default function CameraMarkers({ onCameraClick, selectedCameraId }: CameraMarkersProps) {
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [visibleCameras, setVisibleCameras] = useState<Camera[]>([]);
    const [loading, setLoading] = useState(true);
    const map = useMap();
    const camerasRef = useRef<Camera[]>([]);

    // Load camera data once
    useEffect(() => {
        const loadCameras = async () => {
            try {
                const response = await fetch('/camera_api.json');
                const data: Camera[] = await response.json();
                setCameras(data);
                camerasRef.current = data;
                setLoading(false);
            } catch (error) {
                console.error('Error loading cameras:', error);
                setLoading(false);
            }
        };

        loadCameras();
    }, []);

    // Setup map listeners only once after cameras are loaded
    useEffect(() => {
        if (cameras.length === 0) return;

        function updateVisibleMarkers() {
            if (camerasRef.current.length === 0) return;
            const bounds = map.getBounds();
            const zoom = map.getZoom();
            if (zoom < 12) {
                const filtered = camerasRef.current.filter((_, index) => index % 5 === 0);
                setVisibleCameras(filtered.filter(camera => 
                    bounds.contains([camera.loc.coordinates[1], camera.loc.coordinates[0]])
                ));
            } else if (zoom < 14) {
                const filtered = camerasRef.current.filter((_, index) => index % 2 === 0);
                setVisibleCameras(filtered.filter(camera => 
                    bounds.contains([camera.loc.coordinates[1], camera.loc.coordinates[0]])
                ));
            } else {
                setVisibleCameras(
                    camerasRef.current.filter(camera => 
                        bounds.contains([camera.loc.coordinates[1], camera.loc.coordinates[0]])
                    )
                );
            }
        }

        // Initial update
        updateVisibleMarkers();

        // Update on map move/zoom
        map.on('moveend', updateVisibleMarkers);
        map.on('zoomend', updateVisibleMarkers);

        return () => {
            map.off('moveend', updateVisibleMarkers);
            map.off('zoomend', updateVisibleMarkers);
        };
    }, [cameras.length]);

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
