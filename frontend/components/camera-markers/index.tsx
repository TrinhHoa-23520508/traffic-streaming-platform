// component/camera-markers/index.tsx
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import { icon } from 'leaflet';
import type { Camera } from '@/types/camera';
import { trafficApi } from '@/lib/api/trafficApi';

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

export default function CameraMarkers({ onCameraClick, selectedCameraId, onCamerasUpdate }: CameraMarkersProps) {
    const [visibleCameras, setVisibleCameras] = useState<Camera[]>([]);
    const [loading, setLoading] = useState(true);
    const map = useMap();
    const camerasRef = useRef<Camera[]>([]);
    const trafficDataRef = useRef<Map<string, number>>(new Map());

    const updateVisibleMarkers = useCallback(() => {
        if (!map) return;
        if (camerasRef.current.length === 0) {
            setVisibleCameras([]);
            return;
        }

        const bounds = map.getBounds();

        const inBounds = camerasRef.current.filter((camera) =>
            bounds.contains([camera.loc.coordinates[1], camera.loc.coordinates[0]])
        );

        setVisibleCameras(inBounds);
    }, [map]);

    // Load camera data once
    useEffect(() => {
        const loadCameras = async () => {
            try {
                const response = await fetch('/camera_api.json');
                const data: Camera[] = await response.json();

                // Initialize with zero counts (will be updated from API)
                const withCounts = data.map(d => ({ ...d, density: 0 }));
                camerasRef.current = withCounts as any;
                setLoading(false);

                // Pre-populate trafficApi cache with camera IDs for random data generation
                const cameraIds = data.map(c => c.id || (c as any)._id || c.name);
                trafficApi.initializeCameraIds(cameraIds);

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

    // Fetch initial traffic data and setup real-time updates
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const data = await trafficApi.getLatest();
                // Update traffic data map with initial data
                data.forEach(traffic => {
                    trafficDataRef.current.set(traffic.cameraId, traffic.totalCount);
                });

                // Update camera counts
                camerasRef.current = camerasRef.current.map(c => {
                    const cameraId = c.id || (c as any)._id || c.name;
                    const count = trafficDataRef.current.get(cameraId) ?? 0;
                    return { ...c, density: count };
                });

                // Notify parent component
                if (onCamerasUpdate) {
                    onCamerasUpdate([...camerasRef.current]);
                }
                updateVisibleMarkers();
            } catch (error) {
                console.error('⚠️ Error fetching initial traffic data:', error);
            }
        };

        // Wait for cameras to load first
        const timer = setTimeout(fetchInitialData, 1000);
        return () => clearTimeout(timer);
    }, [onCamerasUpdate, updateVisibleMarkers]);

    // Listen for camera selection from traffic alerts
    useEffect(() => {
        const handleSelectCamera = (event: CustomEvent) => {
            const { cameraId } = event.detail;
            console.log('📹 Selecting camera from alert:', cameraId);

            // Find camera by ID
            const camera = camerasRef.current.find(c =>
                (c.id === cameraId || (c as any)._id === cameraId || c.name === cameraId)
            );

            if (camera && onCameraClick) {
                onCameraClick(camera);
            } else {
                console.warn('Camera not found:', cameraId);
            }
        };

        window.addEventListener('selectCamera', handleSelectCamera as EventListener);

        return () => {
            window.removeEventListener('selectCamera', handleSelectCamera as EventListener);
        };
    }, [onCameraClick]);

    // Subscribe to real-time traffic updates
    useEffect(() => {
        const unsubscribe = trafficApi.subscribe((trafficData) => {

            // Check if cameraId exists, if not, log error
            if (!trafficData.cameraId) {
                console.error('❌ Invalid traffic data - missing cameraId:', trafficData);
                return; // Skip invalid data
            }

            // Update traffic data map
            trafficDataRef.current.set(trafficData.cameraId, trafficData.totalCount);

            // Update camera counts
            camerasRef.current = camerasRef.current.map(c => {
                const cameraId = c.id || (c as any)._id || c.name;
                const count = trafficDataRef.current.get(cameraId) ?? 0;
                return { ...c, density: count };
            });

            // Notify parent component
            if (onCamerasUpdate) {
                onCamerasUpdate([...camerasRef.current]);
            }

            // Force re-render by updating visible cameras
            if (map) {
                const bounds = map.getBounds();
                const inBounds = camerasRef.current.filter((camera) =>
                    bounds.contains([camera.loc.coordinates[1], camera.loc.coordinates[0]])
                );
                setVisibleCameras([...inBounds]); // Create new array to trigger re-render
            }
        });

        // Cleanup subscription on unmount
        return () => {
            unsubscribe();
        };
    }, [map, onCamerasUpdate]);

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
                        zIndexOffset={isSelected ? 1000 : 0}
                        eventHandlers={{
                            click: (e) => {
                                // Bring marker to front on click
                                const marker = e.target;
                                if (marker && marker._icon) {
                                    marker._icon.style.zIndex = '1000';
                                }

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
