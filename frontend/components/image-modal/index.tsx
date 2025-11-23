// frontend/component/image-modal/index.tsx
"use client";

import { useEffect } from 'react';

interface ImageModalProps {
    imageUrl: string;
    onClose: () => void;
}

export default function ImageModal({ imageUrl, onClose }: ImageModalProps) {
    // Bonus: Thêm chức năng đóng modal khi nhấn phím "Escape"
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        // Thêm event listener khi component được mount
        document.addEventListener('keydown', handleKeyDown);

        // Gỡ event listener khi component unmount
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]); // Dependency là onClose để đảm bảo hàm luôn mới nhất

    return (
        // Lớp phủ (backdrop)
        <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-md flex justify-center items-center z-50"
            onClick={onClose} // Click vào nền đen để đóng
        >
            <div 
                className="relative w-[95vw] h-[95vh] flex items-center justify-center"
                // Ngăn việc click vào ảnh làm modal bị đóng
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Hình ảnh được phóng to */}
                <img 
                    src={imageUrl} 
                    alt="Phóng to hình ảnh camera" 
                    className="w-full h-full object-contain rounded-lg shadow-2xl"
                />
                
                {/* Nút đóng */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all hover:scale-110"
                    aria-label="Đóng"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}