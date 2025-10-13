// frontend/component/camera-info-card/index.tsx
"use client"

import type { Camera } from '@/types/camera';

// Định nghĩa props cho component
interface CameraInfoCardProps {
    camera: Camera;
    onClose: () => void;
    onImageClick: (url: string) => void;
    imageRefreshKey?: number; // Thêm prop để nhận key refresh từ cha
}

export default function CameraInfoCard({ camera, onClose,onImageClick, imageRefreshKey }: CameraInfoCardProps) {
    const imageUrl = `https://api.notis.vn/v4/${camera.liveviewUrl}?t=${imageRefreshKey}`;

    return (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mt-2">
            {/* Camera Snapshot */}
            {camera.liveviewUrl && (
                <div className="w-full bg-gray-900 relative cursor-pointer"
                    onClick={() => onImageClick(imageUrl)}>
                    <img 
                        key={imageRefreshKey} // Key để force refresh
                        src={imageUrl}
                        alt={camera.name}
                        className="w-full h-auto object-cover"
                        onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="340" height="200"%3E%3Crect width="340" height="200" fill="%23333"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="Arial" font-size="14"%3EKhông có hình ảnh%3C/text%3E%3C/svg%3E';
                        }}
                    />
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                        🔴 LIVE
                    </div>
                </div>
            )}
            {/* Camera Info */}
            <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-semibold text-gray-700">Thông tin Camera</h3>
                    {/* Sử dụng prop onClose khi click */}
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="font-medium text-gray-800 mb-2">{camera.name}</div>
                <div className="space-y-1 text-xs text-gray-600">
                    <p><strong>ID:</strong> {camera.id}</p>
                    <p><strong>Quận:</strong> {camera.dist}</p>
                    <p><strong>IP:</strong> {camera.values.ip}</p>
                    <p><strong>PTZ:</strong> {camera.ptz ? 'Có' : 'Không'}</p>
                    <p><strong>Góc:</strong> {camera.angle}°</p>
                    <p><strong>Tọa độ:</strong> {camera.loc.coordinates[1].toFixed(6)}, {camera.loc.coordinates[0].toFixed(6)}</p>
                    
                    {/* Thêm thông tin bạn muốn ở đây */}
                    <p><strong>Số lượng xe:</strong> 36 </p>
                    <p><strong>Mức độ giao thông:</strong> Cao </p>
                    <p><strong>Lưu lượng xe:</strong> 36 xe/phút </p>
                    <p><strong>Tình trạng kẹt xe:</strong> Đang kẹt xe </p>

                </div>
                {/*{camera.liveviewUrl && (
                    <button className="mt-3 w-full text-xs bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
                        onClick={() => window.open(`https://api.notis.vn/v4/${camera.liveviewUrl}`, '_blank')}
                    >🎥 Xem Live Stream</button>
                */}
            </div>
        </div>
    );
}