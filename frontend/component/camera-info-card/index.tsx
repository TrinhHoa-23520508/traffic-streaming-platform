// frontend/component/camera-info-card/index.tsx
"use client"

import type { Camera } from '@/types/camera';
import StatCardWithProgress from '@/component/stat-card-progress'; // Đảm bảo đường dẫn đúng
import StatCardWithBadge from '@/component/stat-card-badge';

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
    const imageUrl = `https://api.notis.vn/v4/${camera.liveviewUrl}?t=${imageRefreshKey}`;
   
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
                className="relative w-full rounded-xl overflow-hidden cursor-pointer"
                onClick={() => onImageClick(imageUrl)}
            >
                <img 
                    key={imageRefreshKey}
                    src={imageUrl}
                    alt={camera.name}
                    className="w-full h-auto object-cover bg-gray-900"
                    // onError...
                />
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