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
        // Lớp phủ (backdrop) - Tăng z-index lên cao nhất và làm tối nền hơn
        <div 
            className="fixed inset-0 bg-black/95 backdrop-blur-xl flex justify-center items-center z-[9999]"
            onClick={onClose} // Click vào nền đen để đóng
        >
            <div 
                className="relative w-full h-full flex items-center justify-center p-4"
                // Ngăn việc click vào ảnh làm modal bị đóng
                onClick={(e) => e.stopPropagation()} 
            >
                {/* 
                    ⭐ HƯỚNG DẪN CHỈNH SIZE ẢNH:
                    Bạn có thể thay đổi các class trong className dưới đây để chỉnh kích thước:
                    - max-w-[85vw]: Chiều rộng tối đa là 85% chiều rộng màn hình. (Muốn nhỏ hơn thì giảm số 85 xuống, ví dụ 60vw)
                    - max-h-[85vh]: Chiều cao tối đa là 85% chiều cao màn hình.
                    - w-auto h-auto: Giữ nguyên tỉ lệ ảnh.
                    - rounded-lg: Bo tròn góc ảnh.
                */}
                <img 
                    src={imageUrl} 
                    alt="Phóng to hình ảnh camera" 
                    className="max-w-[85vw] max-h-[85vh] w-auto h-auto object-contain animate-in zoom-in-95 duration-300 rounded-lg shadow-2xl"
                />
                
                {/* Nút đóng - Làm to và nổi bật hơn */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white rounded-full p-3 backdrop-blur-md transition-all hover:scale-110 hover:rotate-90 border border-white/20"
                    aria-label="Đóng"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}