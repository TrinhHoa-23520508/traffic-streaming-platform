import React from 'react';

export default function LoadingSpinner() {
    return (
        <div className="flex items-center gap-4">
            <svg className="animate-spin h-8 w-8 text-indigo-600" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <div className="flex flex-col">
                <span className="text-gray-900 dark:text-gray-100 font-semibold">Đang tải dữ liệu...</span>
            </div>
        </div>
    );
}
