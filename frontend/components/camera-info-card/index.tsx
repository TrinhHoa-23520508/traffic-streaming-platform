// frontend/component/camera-info-card/index.tsx
"use client"

import React, { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { Camera } from '@/types/camera';
import type { TrafficMetricsDTO } from '@/types/traffic';
import { trafficApi } from '@/lib/api/trafficApi';
import { API_CONFIG, getWsUrl } from '@/lib/api/config';
import StatCardWithProgress from '@/components/stat-card-progress';
import StatCardWithBadge from '@/components/stat-card-badge';

// Giả sử kiểu 'Camera' của bạn có cấu trúc dữ liệu như sau


interface CameraInfoCardProps {
    camera: Camera;
    onClose: () => void;
    onImageClick: (url: string) => void;
    imageRefreshKey?: number;
}

// Các hàm trợ giúp để lấy màu (giữ nguyên hoặc tùy chỉnh)
const getTrafficLevelColor = (level: 'Thấp' | 'Trung bình' | 'Cao') => {
    switch (level) {
        case 'Cao': return 'bg-orange-500 text-white';
        default: return 'bg-gray-200 text-gray-800';
    }
};

const getCongestionColor = (status: 'CAO' | 'TRUNG BÌNH' | 'THẤP') => {
    switch (status) {
        case 'CAO': return 'bg-red-500 text-white';
        case 'TRUNG BÌNH': return 'bg-yellow-500 text-white';
        case 'THẤP': return 'bg-green-500 text-white';
        default: return 'bg-gray-200 text-gray-800';
    }
};


export default function CameraInfoCard({ camera, onClose, onImageClick, imageRefreshKey }: CameraInfoCardProps) {
    const initialUrl = `https://api.notis.vn/v4/${camera.liveviewUrl}?t=${imageRefreshKey}`;
    const [currentSrc, setCurrentSrc] = useState<string>(initialUrl);
    const [loadingImage, setLoadingImage] = useState<boolean>(false);
    const imgRef = useRef<HTMLImageElement | null>(null);

    // Traffic data states
    const [trafficData, setTrafficData] = useState<TrafficMetricsDTO | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [vehicleCount, setVehicleCount] = useState<number>(0);
    const [flowRate, setFlowRate] = useState<number>(0);
    const [congestionStatus, setCongestionStatus] = useState<'CAO' | 'TRUNG BÌNH' | 'THẤP'>('THẤP');
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
    
    // WebSocket client ref
    const stompClientRef = useRef<Client | null>(null);
    
    // Refs for flow rate calculation - track timestamps and counts
    const countHistoryRef = useRef<Array<{ count: number; timestamp: number }>>([]);

    // Fetch initial traffic data (lấy dữ liệu lịch sử để tính flow rate)
    useEffect(() => {
        let mounted = true;

        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const cameraId = camera.id || (camera as any)._id || camera.name;
                
                // Fetch latest data from API for initial display
                const data = await trafficApi.getLatestForCamera(cameraId);
                
                if (mounted && data) {
                    setTrafficData(data);
                    setVehicleCount(data.totalCount);
                    updateCongestionStatus(data.totalCount);
                    setLastUpdateTime(new Date()); // Thời điểm frontend nhận data
                    
                    // Initialize count history with current data
                    const now = Date.now();
                    countHistoryRef.current = [{ count: data.totalCount, timestamp: now }];
                }
            } catch (error) {
                console.error('Error fetching initial traffic data:', error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchInitialData();

        return () => {
            mounted = false;
        };
    }, [camera]);

    // Setup WebSocket for real-time updates
    useEffect(() => {
        const cameraId = camera.id || (camera as any)._id || camera.name;
        const wsUrl = getWsUrl();

        const client = new Client({
            brokerURL: undefined,
            webSocketFactory: () => new SockJS(wsUrl),
            reconnectDelay: API_CONFIG.RECONNECT_DELAY,
            onConnect: () => {
                console.log(`✅ WebSocket connected for camera ${cameraId}`);
                
                // Subscribe to traffic topic
                client.subscribe(API_CONFIG.WS_TOPIC, (message) => {
                    try {
                        const data: TrafficMetricsDTO = JSON.parse(message.body);
                        
                        // Only update if message is for this camera
                        if (data.cameraId === cameraId) {
                            setTrafficData(data);
                            setVehicleCount(data.totalCount);
                            updateCongestionStatus(data.totalCount);
                            setLastUpdateTime(new Date()); // Thời điểm nhận data từ WebSocket
                            
                            // Add to count history for flow rate calculation
                            const now = Date.now();
                            countHistoryRef.current.push({ count: data.totalCount, timestamp: now });
                            
                            // Keep only last 2 minutes of data (120 samples at ~1s each)
                            const twoMinutesAgo = now - 120000;
                            countHistoryRef.current = countHistoryRef.current.filter(
                                item => item.timestamp > twoMinutesAgo
                            );
                            
                            // Calculate flow rate
                            calculateFlowRate();
                        }
                    } catch (error) {
                        console.error('Error parsing WebSocket message:', error);
                    }
                });
            },
            onStompError: (frame) => {
                console.error('❌ STOMP error:', frame.headers['message']);
            },
        });

        client.activate();
        stompClientRef.current = client;

        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.deactivate();
            }
        };
    }, [camera]);

    // Helper function to update congestion status
    const updateCongestionStatus = (count: number) => {
        if (count > 80) {
            setCongestionStatus('CAO');
        } else if (count > 40) {
            setCongestionStatus('TRUNG BÌNH');
        } else {
            setCongestionStatus('THẤP');
        }
    };

    // Calculate flow rate from history
    const calculateFlowRate = () => {
        const history = countHistoryRef.current;
        
        if (history.length < 2) {
            setFlowRate(0);
            return;
        }

        // Get oldest and newest entries
        const oldest = history[0];
        const newest = history[history.length - 1];
        
        // Calculate time difference in minutes
        const timeDiffMs = newest.timestamp - oldest.timestamp;
        const timeDiffMinutes = timeDiffMs / 60000;
        
        if (timeDiffMinutes < 0.1) { // Less than 6 seconds, not enough data
            setFlowRate(0);
            return;
        }
        
        // Calculate count difference (absolute change, không quan tâm tăng/giảm)
        const countDiff = Math.abs(newest.count - oldest.count);
        
        // Calculate vehicles per minute
        const rate = Math.round(countDiff / timeDiffMinutes);
        
        setFlowRate(rate);
    };

    // Preload new image when imageRefreshKey or liveviewUrl changes
    useEffect(() => {
        const newUrl = `https://api.notis.vn/v4/${camera.liveviewUrl}?t=${imageRefreshKey}`;
        // if no liveview url, nothing to do
        if (!camera.liveviewUrl) return;

        // If url is already current, do nothing
        if (newUrl === currentSrc) return;

        setLoadingImage(true);
        const img = new Image();
        img.src = newUrl;
        img.onload = () => {
            setCurrentSrc(newUrl);
            setLoadingImage(false);
        };
        img.onerror = () => {
            // fallback placeholder
            setCurrentSrc('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="340" height="200"%3E%3Crect width="340" height="200" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="Arial" font-size="14"%3EKhông có hình ảnh%3C/text%3E%3C/svg%3E');
            setLoadingImage(false);
        };

        return () => {
            // cleanup handlers
            img.onload = null;
            img.onerror = null;
        };
    }, [imageRefreshKey, camera.liveviewUrl]);

    // Display loading state if fetching traffic data
    if (loading && !trafficData) {
        return (
            <div className="bg-gray-50 p-3 rounded-lg shadow-lg space-y-3">
                <div className="flex items-center justify-center h-48">
                    <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                </div>
            </div>
        );
    }

    return (
        // Container chính với nền xám nhạt để làm nổi bật các thẻ trắng
        <div className="bg-gray-50 p-3 rounded-lg shadow-lg space-y-3">

            {/* --- 1. PHẦN HÌNH ẢNH --- */}
            <div
                className="relative w-full rounded-xl overflow-hidden cursor-pointer bg-gray-900"
                onClick={() => onImageClick(currentSrc)}
            >
                <img
                    ref={(el) => { imgRef.current = el; }}
                    src={currentSrc}
                    alt={camera.name}
                    className="w-full h-auto object-cover"
                    onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="340" height="200"%3E%3Crect width="340" height="200" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="Arial" font-size="14"%3EKhông có hình ảnh%3C/text%3E%3C/svg%3E';
                    }}
                />

                {/* Spinner overlay while loading new snapshot */}
                {loadingImage && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                        </svg>
                    </div>
                )}

                <div className="absolute bottom-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                    TRỰC TIẾP
                </div>
            </div>

            {/* --- PHẦN TIÊU ĐỀ (Tên & Quận) --- */}
            <div className="flex justify-between items-start pt-1">
                <div>
                    <h3 className="text-base font-bold text-gray-800">{camera.name}</h3>
                    <p className="text-xs text-gray-500">{camera.dist}</p>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-red-500 p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <StatCardWithProgress
                label="Số lượng xe"
                value={`${vehicleCount} xe`}
                progressPercent={Math.min(vehicleCount, 100)}
                progressColorClass="bg-blue-500"
            />

            <StatCardWithProgress
                label="Lưu lượng xe"
                value={`${flowRate} xe/phút`}
                progressPercent={Math.min(flowRate * 1.5, 100)}
                progressColorClass="bg-purple-500"
            />

            <StatCardWithBadge
                label="Tình trạng kẹt xe"
                badgeText={congestionStatus}
                badgeColorClass={getCongestionColor(congestionStatus)}
            />

            {/* Detection Details - Show vehicle breakdown if available */}
            {trafficData?.detectionDetails && Object.keys(trafficData.detectionDetails).length > 0 && (
                <div className="bg-white rounded-lg p-3 shadow-sm">
                    <h4 className="text-xs font-semibold text-gray-600 mb-2">Chi tiết phương tiện</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        {trafficData.detectionDetails.car !== undefined && (
                            <div className="flex items-center gap-1">
                                <span className="text-blue-500">🚗</span>
                                <span className="text-gray-700">Ô tô: <strong>{trafficData.detectionDetails.car}</strong></span>
                            </div>
                        )}
                        {trafficData.detectionDetails.motorcycle !== undefined && (
                            <div className="flex items-center gap-1">
                                <span className="text-orange-500">🏍️</span>
                                <span className="text-gray-700">Xe máy: <strong>{trafficData.detectionDetails.motorcycle}</strong></span>
                            </div>
                        )}
                        {trafficData.detectionDetails.truck !== undefined && (
                            <div className="flex items-center gap-1">
                                <span className="text-green-500">🚛</span>
                                <span className="text-gray-700">Xe tải: <strong>{trafficData.detectionDetails.truck}</strong></span>
                            </div>
                        )}
                        {trafficData.detectionDetails.bus !== undefined && (
                            <div className="flex items-center gap-1">
                                <span className="text-purple-500">🚌</span>
                                <span className="text-gray-700">Xe buýt: <strong>{trafficData.detectionDetails.bus}</strong></span>
                            </div>
                        )}
                    </div>
                    
                    {/* Timestamp information */}
                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                        {trafficData.timestamp && (
                            <p className="text-xs text-gray-500">
                                <span className="font-medium">Dữ liệu từ:</span>{' '}
                                {new Date(trafficData.timestamp).toLocaleString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                })}
                            </p>
                        )}
                        {lastUpdateTime && (
                            <p className="text-xs text-green-600">
                                <span className="font-medium">🔄 Cập nhật lúc:</span>{' '}
                                {lastUpdateTime.toLocaleTimeString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                })}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}