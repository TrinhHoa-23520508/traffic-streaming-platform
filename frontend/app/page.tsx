"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
    const router = useRouter();
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Give a moment for the page to render the loading message
        const timer = setTimeout(() => {
            setIsReady(true);
            router.replace('/map');
        }, 800); // Show loading message for 800ms

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <div className="fixed inset-0 h-screen w-screen flex items-center justify-center bg-gray-100">
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <div className="text-gray-600 text-lg font-medium">
                    Ho Chi Minh city traffic streaming map is loading...
                </div>
            </div>
        </div>
    );
}

