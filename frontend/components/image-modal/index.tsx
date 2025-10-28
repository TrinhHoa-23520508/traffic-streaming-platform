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
                className="relative max-w-[90vw] max-h-[90vh]"
                // Ngăn việc click vào ảnh làm modal bị đóng
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Hình ảnh được phóng to */}
                <img 
                    src={imageUrl} 
                    alt="Phóng to hình ảnh camera" 
                    className="object-contain max-w-full max-h-full scale-200 rounded-lg"
                />
            </div>
        </div>
    );
}