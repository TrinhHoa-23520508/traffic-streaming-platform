// frontend/component/image-modal/index.tsx
"use client";

import { useEffect } from 'react';

interface ImageModalProps {
    imageUrl: string;
    isAI?: boolean;
    onClose: () => void;
}

export default function ImageModal({ imageUrl, isAI = false, onClose }: ImageModalProps) {
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
        // Lớp phủ (backdrop) - Làm mờ map phía sau thay vì đen
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-[9999]"
            onClick={onClose} // Click vào nền để đóng
        >
            <div 
                className="relative w-full h-full flex items-center justify-center p-4"
                // Ngăn việc click vào ảnh làm modal bị đóng
                onClick={(e) => e.stopPropagation()} 
            >
                {/* Container cho ảnh với nút đóng bên trong */}
                <div className="relative">
                    {/* Ảnh phóng to */}
                    <img 
                        src={imageUrl} 
                        alt="Phóng to hình ảnh camera" 
                        className="max-w-[85vw] max-h-[85vh] w-auto h-auto object-contain animate-in zoom-in-95 duration-300 rounded-lg shadow-2xl"
                    />
                    
                    {/* Badge hiển thị AI hay Live */}
                    <div className={`absolute top-3 left-3 px-3 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 shadow-lg backdrop-blur-md ${isAI ? 'bg-purple-600/90' : 'bg-red-600/90'}`}>
                        {isAI ? (
                            <>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13A2.5 2.5 0 005 15.5A2.5 2.5 0 007.5 18a2.5 2.5 0 002.5-2.5A2.5 2.5 0 007.5 13m9 0a2.5 2.5 0 00-2.5 2.5a2.5 2.5 0 002.5 2.5a2.5 2.5 0 002.5-2.5a2.5 2.5 0 00-2.5-2.5z"/></svg>
                                PHÂN TÍCH AI
                            </>
                        ) : (
                            <>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                </span>
                                TRỰC TIẾP
                            </>
                        )}
                    </div>
                    
                    {/* Nút đóng - Nằm trên ảnh (góc phải trên của ảnh) */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur-md transition-all hover:scale-110 hover:rotate-90 border border-white/20"
                        aria-label="Đóng"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}