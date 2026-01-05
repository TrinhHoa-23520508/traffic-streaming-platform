"use client"

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect, useRef, useCallback, memo, startTransition } from "react";
import { useParams } from "next/navigation";
import SearchBox from "@/components/search";
import CameraInfoCard from "@/components/camera-info-card";
import ImageModal from "@/components/image-modal";
import type { Camera } from "@/types/camera";
import { API_CONFIG } from "@/lib/api/config";
import { FiMap, FiBarChart2, FiFileText } from "react-icons/fi";
import Link from "next/link";

// Preload the map component for faster initial render
const Map = dynamic(
    () => import('@/components/map'),
    {
        loading: () => (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        ),
        ssr: false
    }
);

export default function MapPage() {
    const params = useParams();
    
    // Extract cameraId from optional catch-all route - only used for initial load
    const initialCameraIdRef = useRef<string | null>(params.cameraId ? (params.cameraId as string[])[0] : null);
    const hasLoadedFromUrl = useRef(false);

    const [mapCenter, setMapCenter] = useState<[number, number]>([10.8231, 106.6297]);
    const [locationName, setLocationName] = useState<string>("Ho Chi Minh City");
    const [mapZoom, setMapZoom] = useState<number>(13);
    const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lon: number, name: string } | null>(null);
    const [imageRefreshKey, setImageRefreshKey] = useState<number>(() => Date.now());
    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
    const [isModalAI, setIsModalAI] = useState<boolean>(false);
    const [cameras, setCameras] = useState<Camera[]>([]);

    // Load cameras data - use cache for instant reload
    useEffect(() => {
        const loadCameras = async () => {
            try {
                // Check sessionStorage cache first for instant load
                const cached = sessionStorage.getItem('cameras_data');
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    // Use cache if less than 5 minutes old
                    if (Date.now() - timestamp < 5 * 60 * 1000) {
                        setCameras(data);
                        return;
                    }
                }
                
                const response = await fetch('/camera_api.json');
                const data: Camera[] = await response.json();
                setCameras(data);
                
                // Cache the data
                sessionStorage.setItem('cameras_data', JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));
            } catch (error) {
                console.error('Error loading cameras:', error);
            }
        };
        loadCameras();
    }, []);

    // Handle camera selection from URL (only on initial page load, never again)
    useEffect(() => {
        if (!hasLoadedFromUrl.current && initialCameraIdRef.current && cameras.length > 0) {
            const camera = cameras.find(c => c._id === initialCameraIdRef.current || c.id === initialCameraIdRef.current);
            if (camera) {
                startTransition(() => {
                    setSelectedCamera(camera);
                    setMapCenter([camera.loc.coordinates[1], camera.loc.coordinates[0]]);
                    setLocationName(camera.name);
                    setSelectedLocation(null);
                });
                hasLoadedFromUrl.current = true;
            }
        }
    }, [cameras]);

    // Auto-refresh camera snapshot every 20 seconds
    useEffect(() => {
        if (!selectedCamera) return;

        const interval = setInterval(() => {
            setImageRefreshKey(Date.now());
        }, 20000); // 20 seconds

        return () => clearInterval(interval);
    }, [selectedCamera]);

    useEffect(() => {
        // Chỉ chạy khi modal đang mở Live image và có camera được chọn
        // Không refresh nếu đang xem AI image
        if (modalImageUrl && selectedCamera && !isModalAI) {
            const newImageUrl = `${API_CONFIG.CAMERA_API_URL}/${selectedCamera.liveviewUrl}?t=${imageRefreshKey}`;
            setModalImageUrl(newImageUrl);
        }
    }, [imageRefreshKey, modalImageUrl, selectedCamera, isModalAI]);

    // Memoized handlers to prevent unnecessary re-renders
    const handleLocationSelect = useCallback((lat: number, lon: number, name: string) => {
        startTransition(() => {
            setMapCenter([lat, lon]);
            setLocationName(name);
            setSelectedCamera(null);
            setSelectedLocation({ lat, lon, name });
        });
        // Clear camera from URL without navigation
        window.history.replaceState(null, '', '/map');
    }, []);

    const handleCameraClick = useCallback((camera: Camera) => {
        // Update state first for immediate UI response using startTransition for non-blocking update
        startTransition(() => {
            setSelectedCamera(camera);
            setMapCenter([camera.loc.coordinates[1], camera.loc.coordinates[0]]);
            setLocationName(camera.name);
            setSelectedLocation(null);
        });
        
        // Update URL after state (non-blocking)
        requestAnimationFrame(() => {
            window.history.replaceState(null, '', `/map/${camera._id || camera.id}`);
        });
    }, []);

    const handleCameraClose = useCallback(() => {
        setSelectedCamera(null);
        // Remove camera from URL without navigation
        window.history.replaceState(null, '', '/map');
    }, []);

    const handleImageClick = useCallback((imageUrl: string, isAI: boolean = false) => {
        setModalImageUrl(imageUrl);
        setIsModalAI(isAI);
    }, []);

    const handleCloseModal = useCallback(() => {
        setModalImageUrl(null);
        setIsModalAI(false);
    }, []);

    return (
        <div className="fixed inset-0 h-screen w-screen min-w-[320px] min-h-[500px] overflow-auto">
            {/* Navigation Sidebar - Use Link for prefetching */}
            {!modalImageUrl && (
                <div className="fixed top-3 sm:top-4 md:top-6 left-1.5 sm:left-2 z-[1001] pointer-events-auto">
                    <div className="bg-white rounded-lg shadow-lg p-0.5 sm:p-1 md:p-1.5 flex flex-col gap-0.5 sm:gap-1">
                        <Link
                            href="/map"
                            prefetch={true}
                            className="p-1 sm:p-1.5 md:p-2 rounded-md transition-colors bg-blue-500 text-white hover:bg-blue-600"
                            title="Map"
                        >
                            <FiMap className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                        </Link>
                        <Link
                            href="/statistic"
                            prefetch={true}
                            className="p-1 sm:p-1.5 md:p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
                            title="Statistic"
                        >
                            <FiBarChart2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                        </Link>
                        <Link
                            href="/report"
                            prefetch={true}
                            className="p-1 sm:p-1.5 md:p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
                            title="Report"
                        >
                            <FiFileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                        </Link>
                    </div>
                </div>
            )}

            <div className={`fixed top-3 sm:top-4 md:top-6 left-10 sm:left-12 md:left-16 z-[1000] flex flex-col gap-1.5 sm:gap-2 pointer-events-none ${modalImageUrl ? 'hidden' : ''}`}>
                <div className="w-full max-w-[240px] sm:max-w-[280px] md:max-w-[340px] lg:max-w-[400px] pointer-events-auto">
                    <SearchBox onSelectLocation={handleLocationSelect} />
                </div>
                {selectedCamera && (
                    <div className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] lg:max-w-[400px] pointer-events-auto">
                        <CameraInfoCard
                            camera={selectedCamera}
                            onClose={handleCameraClose}
                            imageRefreshKey={imageRefreshKey}
                            onImageClick={handleImageClick}
                        />
                    </div>
                )}
                {selectedLocation && !selectedCamera && (
                    <div className="w-full max-w-[240px] sm:max-w-[280px] md:max-w-[340px] lg:max-w-[400px] pointer-events-auto bg-white rounded-lg shadow-lg p-2 sm:p-3 mt-1.5 sm:mt-2">
                        <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                            <h3 className="text-xs sm:text-sm font-semibold text-gray-700">Địa điểm</h3>
                            <button onClick={() => setSelectedLocation(null)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="font-medium text-gray-800 mb-1.5 sm:mb-2 text-xs sm:text-sm line-clamp-2">{selectedLocation.name}</div>
                        <div className="space-y-0.5 sm:space-y-1 text-[9px] sm:text-[10px] text-gray-600">
                            <p><strong>Tọa độ:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lon.toFixed(6)}</p>
                        </div>
                    </div>
                )}
            </div>
            <div className="fixed inset-0 z-0">
                <Map
                    posix={mapCenter}
                    zoom={mapZoom}
                    locationName={locationName}
                    onCameraClick={handleCameraClick}
                    selectedCamera={selectedCamera}
                    selectedLocation={selectedLocation}
                    imageRefreshKey={imageRefreshKey}
                    isDrawerOpen={false}
                    isReportOpen={false}
                    isModalOpen={!!modalImageUrl}
                />
            </div>
            {modalImageUrl && (
                <ImageModal
                    key={modalImageUrl}
                    imageUrl={modalImageUrl}
                    isAI={isModalAI}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    )
}
