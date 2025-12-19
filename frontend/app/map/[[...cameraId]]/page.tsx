"use client"

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import SearchBox from "@/components/search";
import CameraInfoCard from "@/components/camera-info-card";
import ImageModal from "@/components/image-modal";
import type { Camera } from "@/types/camera";
import CityStatsDrawer from "@/components/city-statistics";
import ReportDialog from "@/components/report-dialog";
import { FiMap, FiBarChart2, FiFileText } from "react-icons/fi";

export default function MapPage() {
    const params = useParams();
    const router = useRouter();
    
    // Extract cameraId from optional catch-all route - only used for initial load
    const initialCameraIdRef = useRef<string | null>(params.cameraId ? (params.cameraId as string[])[0] : null);
    const hasLoadedFromUrl = useRef(false);

    const [mapCenter, setMapCenter] = useState<[number, number]>([10.8231, 106.6297]);
    const [locationName, setLocationName] = useState<string>("Ho Chi Minh City");
    const [mapZoom, setMapZoom] = useState<number>(13);
    const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
    const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
    const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lon: number, name: string } | null>(null);
    const [imageRefreshKey, setImageRefreshKey] = useState<number>(0);
    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
    const [cameras, setCameras] = useState<Camera[]>([]);

    const Map = useMemo(() => dynamic(
        () => import('@/components/map'),
        {
            loading: () => <p>Loading</p>,
            ssr: false
        }
    ), [])

    // Load cameras data
    useEffect(() => {
        const loadCameras = async () => {
            try {
                const response = await fetch('/camera_api.json');
                const data: Camera[] = await response.json();
                setCameras(data);
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
                setSelectedCamera(camera);
                setMapCenter([camera.loc.coordinates[1], camera.loc.coordinates[0]]);
                setLocationName(camera.name);
                setSelectedLocation(null);
                hasLoadedFromUrl.current = true;
            }
        }
    }, [cameras]);

    // Initialize imageRefreshKey on client side only
    useEffect(() => {
        setImageRefreshKey(Date.now());
    }, [])

    // Auto-refresh camera snapshot every 20 seconds
    useEffect(() => {
        if (!selectedCamera) return;

        const interval = setInterval(() => {
            setImageRefreshKey(Date.now());
        }, 20000); // 20 seconds

        return () => clearInterval(interval);
    }, [selectedCamera]);

    useEffect(() => {
        // Chỉ chạy khi modal đang mở và có camera được chọn
        if (modalImageUrl && selectedCamera) {
            const newImageUrl = `https://api.notis.vn/v4/${selectedCamera.liveviewUrl}?t=${imageRefreshKey}`;
            setModalImageUrl(newImageUrl);
        }
    }, [imageRefreshKey]);

    const handleLocationSelect = (lat: number, lon: number, name: string) => {
        setMapCenter([lat, lon]);
        setLocationName(name);
        setSelectedCamera(null);
        setSelectedLocation({ lat, lon, name });
        // Clear camera from URL without navigation
        window.history.replaceState(null, '', '/map');
    };

    const handleCameraClick = (camera: Camera) => {
        console.log('📹 Camera Clicked:', {
            id: camera.id || camera._id,
            name: camera.name,
            density: (camera as any).density || 'N/A',
            coordinates: [camera.loc.coordinates[1], camera.loc.coordinates[0]]
        });
        
        // Update state first for immediate UI response
        setSelectedCamera(camera);
        setMapCenter([camera.loc.coordinates[1], camera.loc.coordinates[0]]);
        setLocationName(camera.name);
        setSelectedLocation(null);
        
        // Update URL after state (non-blocking)
        requestAnimationFrame(() => {
            window.history.replaceState(null, '', `/map/${camera._id || camera.id}`);
        });
    };

    const handleCameraClose = () => {
        setSelectedCamera(null);
        // Remove camera from URL without navigation
        window.history.replaceState(null, '', '/map');
    };

    const handleImageClick = (imageUrl: string) => {
        setModalImageUrl(imageUrl);
    }

    // Handlers for navigation to stats and report pages
    const handleOpenStats = () => {
        // Close any selected camera before navigating
        if (selectedCamera) {
            setSelectedCamera(null);
        }
        // Navigate to stats page
        router.push('/statistic');
    };

    const handleOpenReport = () => {
        // Close any selected camera before navigating
        if (selectedCamera) {
            setSelectedCamera(null);
        }
        // Navigate to report page
        router.push('/report');
    };

    return (
        <div className="fixed inset-0 h-screen w-screen overflow-visible">
            {/* Navigation Sidebar */}
            {!modalImageUrl && (
                <div className="fixed top-6 left-2 z-[1001] pointer-events-auto">
                    <div className="bg-white rounded-lg shadow-lg p-1.5 flex flex-col gap-1.5">
                        <button
                            onClick={() => router.push('/map')}
                            className="p-2 rounded-md transition-colors bg-blue-500 text-white hover:bg-blue-600"
                            title="Map"
                        >
                            <FiMap size={16} />
                        </button>
                        <button
                            onClick={handleOpenStats}
                            className="p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
                            title="Statistic"
                        >
                            <FiBarChart2 size={16} />
                        </button>
                        <button
                            onClick={handleOpenReport}
                            className="p-2 rounded-md transition-colors text-gray-700 hover:bg-gray-100"
                            title="Report"
                        >
                            <FiFileText size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div className={`fixed top-6 left-16 z-[1000] flex flex-col gap-2 pointer-events-none ${modalImageUrl ? 'hidden' : ''}`}>
                <div className="w-[600px] max-w-full pointer-events-auto">
                    <SearchBox onSelectLocation={handleLocationSelect} />
                </div>
                {selectedCamera && (
                    <div className="w-[420px] pointer-events-auto">
                        <CameraInfoCard
                            camera={selectedCamera}
                            onClose={handleCameraClose}
                            imageRefreshKey={imageRefreshKey}
                            onImageClick={handleImageClick}
                        />
                    </div>
                )}
                {selectedLocation && !selectedCamera && (
                    <div className="w-[600px] pointer-events-auto bg-white rounded-lg shadow-lg p-4 mt-2">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-base font-semibold text-gray-700">Địa điểm</h3>
                            <button onClick={() => setSelectedLocation(null)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="font-medium text-gray-800 mb-2">{selectedLocation.name}</div>
                        <div className="space-y-1 text-xs text-gray-600">
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
                    onOpenDrawer={handleOpenStats}
                    isReportOpen={false}
                    onOpenReport={handleOpenReport}
                    isModalOpen={!!modalImageUrl}
                />
            </div>
            {modalImageUrl && (
                <ImageModal
                    key={modalImageUrl}
                    imageUrl={modalImageUrl}
                    onClose={() => setModalImageUrl(null)}
                />
            )}
        </div>
    )
}
