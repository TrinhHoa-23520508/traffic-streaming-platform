// frontend/component/camera-info-card/index.tsx
"use client"

import React, { useEffect, useRef, useState } from 'react';
import type { Camera } from '@/types/camera';
import StatCardWithProgress from '@/components/stat-card-progress'; // Đảm bảo đường dẫn đúng
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

const getCongestionColor = (status: 'Thông thoáng' | 'Đang kẹt xe') => {
    return status === 'Đang kẹt xe' ? 'bg-red-500 text-white' : 'bg-green-500 text-white';
};


export default function CameraInfoCard({ camera, onClose, onImageClick, imageRefreshKey }: CameraInfoCardProps) {
    const initialUrl = `https://api.notis.vn/v4/${camera.liveviewUrl}?t=${imageRefreshKey}`;
    const [currentSrc, setCurrentSrc] = useState<string>(initialUrl);
    const [loadingImage, setLoadingImage] = useState<boolean>(false);
    const imgRef = useRef<HTMLImageElement | null>(null);

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

    const fakeAnalytics = {
        vehicleCount: 68,
        trafficLevel: 'Cao' as const, // Thêm 'as const' để TypeScript hiểu đây là giá trị cố định
        flowRate: 39,
        congestionStatus: 'Đang kẹt xe' as const,
    };

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
                value={`${fakeAnalytics.vehicleCount} xe`}
                progressPercent={Math.min(fakeAnalytics.vehicleCount, 100)}
                progressColorClass="bg-blue-500"
            />

            <StatCardWithBadge
                label="Mức độ giao thông"
                badgeText={fakeAnalytics.trafficLevel}
                badgeColorClass={getTrafficLevelColor(fakeAnalytics.trafficLevel)}
            />

            <StatCardWithProgress
                label="Lưu lượng xe"
                value={`${fakeAnalytics.flowRate} xe/phút`}
                progressPercent={Math.min(fakeAnalytics.flowRate * 1.5, 100)}
                progressColorClass="bg-purple-500"
            />

            <StatCardWithBadge
                label="Tình trạng kẹt xe"
                badgeText={fakeAnalytics.congestionStatus}
                badgeColorClass={getCongestionColor(fakeAnalytics.congestionStatus)}
            />
        </div>
    );
}