// frontend/component/camera-info-card/index.tsx
"use client"

import React, { useEffect, useRef, useState } from 'react';
import type { Camera } from '@/types/camera';
import StatCardWithProgress from '@/components/stat-card-progress'; // Đảm bảo đường dẫn đúng
import StatCardWithBadge from '@/components/stat-card-badge';
import { trafficApi } from '@/lib/api/trafficApi';
import type { TrafficMetricsDTO } from '@/types/traffic';

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

    // ⭐ Real-time traffic data states
    const [trafficData, setTrafficData] = useState<TrafficMetricsDTO | null>(null);
    const [loading, setLoading] = useState(true);
    const [countHistory, setCountHistory] = useState<Array<{count: number, timestamp: number}>>([]);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

    // ⭐ Fetch initial traffic data from API
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);
                const cameraId = camera.id || (camera as any)._id || camera.name;
                console.log('🔍 Fetching initial data for camera:', cameraId);
                
                // ⭐ Thử lấy từ API trước
                const data = await trafficApi.getCameraLatest(cameraId);
                console.log('✅ Initial data loaded from API:', data);
                
                setTrafficData(data);
                setLastUpdateTime(new Date());
                
                // Initialize history with first data point
                setCountHistory([{
                    count: data.totalCount,
                    timestamp: Date.now()
                }]);
            } catch (error) {
                console.error('⚠️ Error fetching camera data from API:', error);
                
                // ⭐ FALLBACK: Lấy từ cache của trafficApi (có thể là random data nếu fallback mode active)
                const cameraId = camera.id || (camera as any)._id || camera.name;
                const cachedData = trafficApi.getCachedData(cameraId);
                
                if (cachedData) {
                    console.log('✅ Using cached data from trafficApi:', cachedData);
                    setTrafficData(cachedData);
                    setLastUpdateTime(new Date());
                    
                    setCountHistory([{
                        count: cachedData.totalCount,
                        timestamp: Date.now()
                    }]);
                } else {
                    console.warn('⚠️ No cached data available for camera:', cameraId);
                    // Keep loading = false, trafficData = null sẽ hiện "Không có dữ liệu"
                }
            } finally {
                setLoading(false);
            }
        };
        
        fetchInitialData();
    }, [camera]);

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

    // ⭐ Subscribe to real-time traffic updates via WebSocket
    useEffect(() => {
        const cameraId = camera.id || (camera as any)._id || camera.name;
        console.log('📡 Subscribing to real-time updates for camera:', cameraId);
        
        const unsubscribe = trafficApi.subscribe((data) => {
            // ⭐ Filter: chỉ update nếu data thuộc camera này
            if (data.cameraId === cameraId) {
                console.log('📨 Camera data updated:', {
                    cameraId: data.cameraId,
                    totalCount: data.totalCount,
                    timestamp: data.timestamp
                });
                
                setTrafficData(data);
                setLastUpdateTime(new Date());
                
                // ⭐ Update history cho flow rate calculation (keep 2 minutes)
                setCountHistory(prev => {
                    const now = Date.now();
                    const twoMinutesAgo = now - 2 * 60 * 1000;
                    
                    // Filter data trong 2 phút gần nhất + add new data
                    const filtered = prev.filter(item => item.timestamp > twoMinutesAgo);
                    return [...filtered, { count: data.totalCount, timestamp: now }];
                });
            }
        });
        
        // ⭐ Cleanup subscription khi component unmount hoặc camera thay đổi
        return () => {
            console.log('🚪 Unsubscribing from camera:', cameraId);
            unsubscribe();
        };
    }, [camera]);

    // ⭐ Calculate flow rate từ history (xe/phút)
    const calculateFlowRate = (): number => {
        if (countHistory.length < 2) return 0;
        
        const latest = countHistory[countHistory.length - 1];
        const oldest = countHistory[0];
        
        const countDiff = latest.count - oldest.count;
        const timeDiff = (latest.timestamp - oldest.timestamp) / 1000 / 60; // convert to minutes
        
        if (timeDiff === 0) return 0;
        
        return Math.max(0, Math.round(countDiff / timeDiff)); // Không âm
    };

    // ⭐ Calculate congestion status dựa trên totalCount
    const getCongestionStatus = (): 'CAO' | 'TRUNG BÌNH' | 'THẤP' => {
        if (!trafficData) return 'THẤP';
        
        const count = trafficData.totalCount;
        if (count > 50) return 'CAO';
        if (count > 20) return 'TRUNG BÌNH';
        return 'THẤP';
    };

    const flowRate = calculateFlowRate();
    const congestionStatus = getCongestionStatus();

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

            {/* ⭐ Loading state */}
            {loading ? (
                <div className="text-center py-4 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-2 text-sm">Đang tải dữ liệu...</p>
                </div>
            ) : trafficData ? (
                <>
                    <StatCardWithProgress
                        label="Số lượng xe"
                        value={`${trafficData.totalCount} xe`}
                        progressPercent={Math.min(trafficData.totalCount, 100)}
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

                    {/* ⭐ Hiển thị Detection Details */}
                    {trafficData.detectionDetails && Object.keys(trafficData.detectionDetails).length > 0 && (
                        <div className="bg-white p-3 rounded-lg shadow-sm">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">Chi tiết phát hiện:</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(trafficData.detectionDetails).map(([type, count]) => (
                                    <div key={type} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                        <span className="text-gray-600 capitalize">{type}:</span>
                                        <span className="font-semibold text-gray-800">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ⭐ Timestamps */}
                    <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                        {trafficData.timestamp && (
                            <p className="text-xs text-gray-500">
                                <span className="font-medium">Dữ liệu từ:</span>{' '}
                                {typeof trafficData.timestamp === 'string' 
                                    ? new Date(trafficData.timestamp).toLocaleString('vi-VN')
                                    : new Date(trafficData.timestamp).toLocaleString('vi-VN')
                                }
                            </p>
                        )}
                        {lastUpdateTime && (
                            <p className="text-xs text-green-600">
                                <span className="font-medium">🔄 Cập nhật lúc:</span>{' '}
                                {lastUpdateTime.toLocaleTimeString('vi-VN')}
                            </p>
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">⚠️ Không có dữ liệu giao thông</p>
                </div>
            )}
        </div>
    );
}