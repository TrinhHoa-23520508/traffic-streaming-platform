// component/camera-markers/index.tsx
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import { icon } from 'leaflet';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { Camera } from '@/types/camera';
import type { TrafficMetricsDTO } from '@/types/traffic';
import { trafficApi } from '@/lib/api/trafficApi';
import { API_CONFIG, getWsUrl } from '@/lib/api/config';

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
    const stompClientRef = useRef<Client | null>(null);
    const trafficDataRef = useRef<Map<string, number>>(new Map());
    const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
    const randomDataIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
                
                // Initialize with zero counts (will be updated from API)
                const withCounts = data.map(d => ({ ...d, _randCount: 0 }));
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

    // Fetch initial traffic data using API service
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const data = await trafficApi.getLatest();
                
                // Update traffic data map with initial data
                data.forEach(traffic => {
                    trafficDataRef.current.set(traffic.cameraId, traffic.totalCount);
                });
                
                // Update camera counts - try multiple ID fields
                camerasRef.current = camerasRef.current.map(c => {
                    // Try different ID fields: id, _id, or name
                    const cameraId = c.id || (c as any)._id || c.name;
                    const count = trafficDataRef.current.get(cameraId) ?? 0;
                    return { ...c, _randCount: count };
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

        // Wait a bit for cameras to load first
        const timer = setTimeout(fetchInitialData, 1000);
        return () => clearTimeout(timer);
    }, [onCamerasUpdate, updateVisibleMarkers]);

    // Setup WebSocket connection for real-time updates
    useEffect(() => {
        let isActive = true;
        let reconnectAttempts = 0;
        let connectionTimeout: NodeJS.Timeout;

        const startRandomDataFallback = () => {
            console.log('📡 WebSocket unavailable, using random traffic data...');
            
            // Clear any existing interval
            if (randomDataIntervalRef.current) {
                clearInterval(randomDataIntervalRef.current);
            }
            
            // Generate random traffic data every 5 seconds
            randomDataIntervalRef.current = setInterval(() => {
                camerasRef.current = camerasRef.current.map(c => ({
                    ...c,
                    _randCount: Math.floor(Math.random() * 51) // Random 0-50
                }));
                
                if (onCamerasUpdate) {
                    onCamerasUpdate([...camerasRef.current]);
                }
                updateVisibleMarkers();
            }, 5000);
            
            // Initial random data
            camerasRef.current = camerasRef.current.map(c => ({
                ...c,
                _randCount: Math.floor(Math.random() * 51)
            }));
            
            if (onCamerasUpdate) {
                onCamerasUpdate([...camerasRef.current]);
            }
            updateVisibleMarkers();
        };

        const connectWebSocket = () => {
            if (!isActive || reconnectAttempts >= API_CONFIG.MAX_RECONNECT_ATTEMPTS) {
                if (reconnectAttempts >= API_CONFIG.MAX_RECONNECT_ATTEMPTS) {
                    console.warn('⚠️ Max reconnection attempts reached. Switching to random data mode.');
                    startRandomDataFallback();
                }
                return;
            }

            const wsUrl = getWsUrl();

            // Set a timeout to switch to random data if connection takes too long
            connectionTimeout = setTimeout(() => {
                if (!isWebSocketConnected) {
                    console.warn('⚠️ WebSocket connection timeout. Using random data.');
                    startRandomDataFallback();
                }
            }, 15000); // 15 seconds timeout

            // Create STOMP client with SockJS
            const client = new Client({
                brokerURL: undefined,
                webSocketFactory: () => {
                    return new SockJS(wsUrl, null, {
                        transports: ['websocket', 'xhr-streaming', 'xhr-polling']
                    });
                },
                reconnectDelay: API_CONFIG.RECONNECT_DELAY,
                heartbeatIncoming: 4000,
                heartbeatOutgoing: 4000,
                connectionTimeout: API_CONFIG.DEFAULT_TIMEOUT,
                onConnect: () => {
                    clearTimeout(connectionTimeout);
                    setIsWebSocketConnected(true);
                    reconnectAttempts = 0;
                    
                    // Stop random data if it was running
                    if (randomDataIntervalRef.current) {
                        clearInterval(randomDataIntervalRef.current);
                        randomDataIntervalRef.current = null;
                    }
                    
                    console.log('✅ WebSocket connected, using real-time data');
                    
                    // Subscribe to traffic topic
                    client.subscribe(API_CONFIG.WS_TOPIC, (message) => {
                        try {
                            const trafficData: TrafficMetricsDTO = JSON.parse(message.body);
                            
                            // Update traffic data map
                            trafficDataRef.current.set(trafficData.cameraId, trafficData.totalCount);
                            
                            // Update camera counts - try multiple ID fields
                            camerasRef.current = camerasRef.current.map(c => {
                                const cameraId = c.id || (c as any)._id || c.name;
                                const count = trafficDataRef.current.get(cameraId) ?? 0;
                                return { ...c, _randCount: count };
                            });
                            
                            // Notify parent component
                            if (onCamerasUpdate) {
                                onCamerasUpdate([...camerasRef.current]);
                            }
                            updateVisibleMarkers();
                        } catch (error) {
                            console.error('Error parsing traffic data:', error);
                        }
                    });
                },
                onStompError: (frame) => {
                    console.error('❌ STOMP error:', frame.headers['message']);
                    reconnectAttempts++;
                    setIsWebSocketConnected(false);
                },
                onWebSocketError: (event) => {
                    console.error('❌ WebSocket error:', event);
                    reconnectAttempts++;
                    setIsWebSocketConnected(false);
                },
                onWebSocketClose: (event) => {
                    reconnectAttempts++;
                    setIsWebSocketConnected(false);
                },
                onDisconnect: () => {
                    setIsWebSocketConnected(false);
                }
            });

            // Activate the client
            try {
                client.activate();
                stompClientRef.current = client;
            } catch (error) {
                console.error('Failed to activate STOMP client:', error);
                reconnectAttempts++;
                setIsWebSocketConnected(false);
            }
        };

        connectWebSocket();

        // Cleanup on unmount
        return () => {
            isActive = false;
            clearTimeout(connectionTimeout);
            
            if (randomDataIntervalRef.current) {
                clearInterval(randomDataIntervalRef.current);
            }
            
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
            }
        };
    }, [onCamerasUpdate, updateVisibleMarkers]);

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
