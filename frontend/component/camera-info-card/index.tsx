// frontend/component/camera-info-card/index.tsx
"use client"

import type { Camera } from '@/types/camera';

// Giả sử kiểu 'Camera' của bạn có cấu trúc dữ liệu như sau
interface EnrichedCamera extends Camera {
    analytics?: {
        vehicleCount: number;
        trafficLevel: 'Thấp' | 'Trung bình' | 'Cao';
        flowRate: number; // xe/phút
        congestionStatus: 'Thông thoáng' | 'Đang kẹt xe';
    }
}

interface CameraInfoCardProps {
    camera: EnrichedCamera;
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
    const analytics = camera.analytics;

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
                <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
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

            {/* --- PHẦN THÔNG TIN TỪ DỮ LIỆU GIẢ --- */}
            
            {/* Thẻ: Số lượng xe */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-gray-600">Số lượng xe</span>
                    <span className="font-semibold text-gray-800">{fakeAnalytics.vehicleCount} xe</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(fakeAnalytics.vehicleCount, 100)}%` }}></div>
                </div>
            </div>

            {/* Thẻ: Mức độ giao thông */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center text-sm">
                <span className="text-gray-600">Mức độ giao thông</span>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${getTrafficLevelColor(fakeAnalytics.trafficLevel)}`}>
                    {fakeAnalytics.trafficLevel.toUpperCase()}
                </span>
            </div>

            {/* Thẻ: Lưu lượng xe */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-gray-600">Lưu lượng xe</span>
                    <span className="font-semibold text-gray-800">{fakeAnalytics.flowRate} xe/phút</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min(fakeAnalytics.flowRate * 1.5, 100)}%` }}></div>
                </div>
            </div>

            {/* Thẻ: Tình trạng kẹt xe */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center text-sm">
                <span className="text-gray-600">Tình trạng kẹt xe</span>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${getCongestionColor(fakeAnalytics.congestionStatus)}`}>
                    {fakeAnalytics.congestionStatus.toUpperCase()}
                </span>
            </div>

             {/* Nút đóng được đặt ở cuối, bên ngoài các thẻ */}
             <button 
                onClick={onClose} 
                className="w-full text-center text-xs text-gray-500 py-2 hover:text-red-500"
            >
                Đóng
            </button>
        </div>
    );
}