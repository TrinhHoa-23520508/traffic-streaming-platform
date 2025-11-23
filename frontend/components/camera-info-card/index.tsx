// frontend/component/camera-info-card/index.tsx
"use client"

import React, { useEffect, useRef, useState } from 'react';
import type { Camera } from '@/types/camera';
import StatCardWithProgress from '@/components/stat-card-progress'; // Đảm bảo đường dẫn đúng
import StatCardWithBadge from '@/components/stat-card-badge';
import { trafficApi } from '@/lib/api/trafficApi';
import type { TrafficMetricsDTO } from '@/types/traffic';
import { FaCar, FaMotorcycle, FaBus, FaTruck } from 'react-icons/fa6';
import { RiRobot2Fill, RiLiveFill } from 'react-icons/ri';
import { IoClose } from 'react-icons/io5';

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
    
    // ⭐ AI Toggle State
    const [showAI, setShowAI] = useState(false);

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

    // Determine image source based on toggle
    const cameraId = camera.id || (camera as any)._id || camera.name;
    const encodedCameraId = encodeURIComponent(cameraId);
    const aiImageUrl = `http://localhost:1810/api/images/camera/${encodedCameraId}/latest`;

    const displaySrc = showAI ? aiImageUrl : currentSrc;

    const vehicleConfig = {
        car: { label: 'Ô tô', icon: FaCar, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        motorcycle: { label: 'Xe máy', icon: FaMotorcycle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
        bus: { label: 'Xe buýt', icon: FaBus, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
        truck: { label: 'Xe tải', icon: FaTruck, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' }
    };

    return (
        // Container chính - w-[420px] để chỉnh kích thước
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl space-y-4 w-[420px] border border-white/20 transition-all duration-500 animate-in slide-in-from-bottom-4 fade-in zoom-in-95">

            {/* --- PHẦN TIÊU ĐỀ (Tên & Quận) --- */}
            <div className="flex justify-between items-start">
                <div className="flex-1 pr-2">
                    <h3 className="text-lg font-bold text-gray-800 leading-tight line-clamp-2">{camera.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-full">
                            {camera.dist}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-green-600 font-medium">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            Online
                        </span>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="group bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 p-2 rounded-full transition-all duration-300 shadow-sm hover:shadow"
                >
                    <IoClose className="w-5 h-5 transition-transform group-hover:rotate-90" />
                </button>
            </div>

            {/* --- 1. PHẦN HÌNH ẢNH --- */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-900 shadow-lg group ring-1 ring-black/5">
                <img
                    ref={(el) => { imgRef.current = el; }}
                    src={displaySrc}
                    alt={camera.name}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 cursor-pointer ${showAI ? 'scale-105' : ''}`}
                    onClick={() => onImageClick(displaySrc)}
                    onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="340" height="200"%3E%3Crect width="340" height="200" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="Arial" font-size="14"%3EKhông có hình ảnh%3C/text%3E%3C/svg%3E';
                    }}
                />

                {/* Spinner overlay */}
                {loadingImage && !showAI && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-2">
                            <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                            <span className="text-xs text-white/80 font-medium">Đang tải...</span>
                        </div>
                    </div>
                )}

                {/* Live / AI Badge */}
                <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-bold text-white flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-colors duration-300 ${showAI ? 'bg-purple-600/90' : 'bg-red-600/90'}`}>
                    {showAI ? <RiRobot2Fill className="w-3.5 h-3.5" /> : <RiLiveFill className="w-3.5 h-3.5 animate-pulse" />}
                    {showAI ? 'PHÂN TÍCH AI' : 'TRỰC TIẾP'}
                </div>

                {/* Toggle Switch Overlay - Redesigned */}
                <div className="absolute bottom-3 right-3">
                    <div className="bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/10 flex items-center shadow-xl">
                        <button 
                            onClick={() => setShowAI(false)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 flex items-center gap-1 ${!showAI ? 'bg-red-500 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}
                        >
                            <RiLiveFill className="w-3 h-3" />
                            Live
                        </button>
                        <button 
                            onClick={() => setShowAI(true)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all duration-300 flex items-center gap-1 ${showAI ? 'bg-purple-600 text-white shadow-md' : 'text-gray-300 hover:text-white'}`}
                        >
                            <RiRobot2Fill className="w-3 h-3" />
                            AI
                        </button>
                    </div>
                </div>
            </div>

            {/* ⭐ Loading state */}
            {loading ? (
                <div className="py-8 flex flex-col items-center justify-center text-gray-400 space-y-3">
                    <div className="relative">
                        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        </div>
                    </div>
                    <p className="text-xs font-medium animate-pulse">Đang đồng bộ dữ liệu...</p>
                </div>
            ) : trafficData ? (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                    
                    {/* Stats Grid - Enhanced */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Vehicle Count */}
                        <div className="bg-gradient-to-br from-blue-50 to-white p-3 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-100 rounded-bl-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider relative z-10">Số lượng xe</span>
                            <div className="flex items-end gap-1 mt-1 relative z-10">
                                <span className="text-2xl font-black text-gray-800">{trafficData.totalCount}</span>
                                <span className="text-xs font-medium text-gray-500 mb-1">xe</span>
                            </div>
                            <div className="w-full bg-blue-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(trafficData.totalCount, 100)}%` }}></div>
                            </div>
                        </div>

                        {/* Flow Rate */}
                        <div className="bg-gradient-to-br from-purple-50 to-white p-3 rounded-xl border border-purple-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-purple-100 rounded-bl-full -mr-8 -mt-8 opacity-50 group-hover:scale-110 transition-transform"></div>
                            <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider relative z-10">Lưu lượng</span>
                            <div className="flex items-end gap-1 mt-1 relative z-10">
                                <span className="text-2xl font-black text-gray-800">{flowRate}</span>
                                <span className="text-xs font-medium text-gray-500 mb-1">xe/phút</span>
                            </div>
                            <div className="w-full bg-purple-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                <div className="bg-purple-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(flowRate * 1.5, 100)}%` }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Congestion Status - Enhanced */}
                    <div className={`flex items-center justify-between p-3 rounded-xl border shadow-sm transition-colors duration-300 ${
                        congestionStatus === 'CAO' ? 'bg-red-50 border-red-100' : 
                        congestionStatus === 'TRUNG BÌNH' ? 'bg-yellow-50 border-yellow-100' : 
                        'bg-green-50 border-green-100'
                    }`}>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${
                                congestionStatus === 'CAO' ? 'bg-red-500' : 
                                congestionStatus === 'TRUNG BÌNH' ? 'bg-yellow-500' : 
                                'bg-green-500'
                            }`}></div>
                            <span className="text-xs font-semibold text-gray-700">Tình trạng giao thông</span>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full shadow-sm ${
                            congestionStatus === 'CAO' ? 'bg-red-500 text-white' : 
                            congestionStatus === 'TRUNG BÌNH' ? 'bg-yellow-500 text-white' : 
                            'bg-green-500 text-white'
                        }`}>
                            {congestionStatus}
                        </span>
                    </div>

                    {/* ⭐ Detection Details - With Icons & Vietnamese */}
                    {trafficData.detectionDetails && Object.keys(trafficData.detectionDetails).length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                            {Object.entries(trafficData.detectionDetails).map(([type, count]) => {
                                const config = vehicleConfig[type as keyof typeof vehicleConfig] || { label: type, icon: FaCar, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100' };
                                const Icon = config.icon;
                                return (
                                    <div key={type} className={`flex flex-col items-center justify-center p-2 rounded-lg border ${config.bg} ${config.border} transition-transform hover:-translate-y-1 duration-300`}>
                                        <Icon className={`w-5 h-5 mb-1 ${config.color}`} />
                                        <span className="text-[10px] font-medium text-gray-500">{config.label}</span>
                                        <span className={`text-sm font-bold ${config.color}`}>{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* ⭐ Timestamps - Minimalist */}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-[10px]">
                        {trafficData.timestamp && (
                            <div className="flex items-center gap-1 text-gray-400">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span>{new Date(trafficData.timestamp).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                        )}
                        {lastUpdateTime && (
                            <span className="text-green-600 flex items-center gap-1 font-medium bg-green-50 px-2 py-0.5 rounded-full">
                                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Cập nhật thời gian thực
                            </span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    <p className="text-xs font-medium">Không có dữ liệu giao thông</p>
                </div>
            )}
        </div>
    );
}