"use client"

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect } from "react";
import SearchBox from "@/components/search";
import CameraInfoCard from "@/components/camera-info-card";
import ImageModal from "@/components/image-modal";
import type { Camera } from "@/types/camera";
import CityStatsDrawer from "@/components/city-statistics";

export default function Page() {
    const [mapCenter, setMapCenter] = useState<[number, number]>([10.8231, 106.6297]);
    const [locationName, setLocationName] = useState<string>("Ho Chi Minh City");
    const [mapZoom, setMapZoom] = useState<number>(13);
    const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);
    const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<{ lat: number, lon: number, name: string } | null>(null);
    const [imageRefreshKey, setImageRefreshKey] = useState<number>(0);
    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);

    const Map = useMemo(() => dynamic(
        () => import('@/components/map'),
        {
            loading: () => <p>A map is loading</p>,
            ssr: false
        }
    ), [])

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
    };

    const handleCameraClick = (camera: Camera) => {
        console.log('📹 Camera Clicked:', {
            id: camera.id || camera._id,
            name: camera.name,
            density: (camera as any).density || 'N/A',
            coordinates: [camera.loc.coordinates[1], camera.loc.coordinates[0]]
        });
        setSelectedCamera(camera);
        setMapCenter([camera.loc.coordinates[1], camera.loc.coordinates[0]]);
        setLocationName(camera.name);
        setSelectedLocation(null);
    };

    const handleImageClick = (imageUrl: string) => {
        setModalImageUrl(imageUrl);
    }

    return (
        <div className="fixed inset-0 h-screen w-screen overflow-visible">
            <div className="fixed top-6 left-6 z-[1000] flex flex-col gap-2 w-[600px] max-w-full pointer-events-auto">
                {!modalImageUrl && (
                    // Render SearchBox directly and let it fill the parent width; remove the behind white panel
                    <div className="w-full">
                        <SearchBox onSelectLocation={handleLocationSelect} />
                    </div>
                )}
                {selectedCamera && !modalImageUrl && (
                    <CameraInfoCard
                        camera={selectedCamera}
                        onClose={() => setSelectedCamera(null)}
                        imageRefreshKey={imageRefreshKey}
                        onImageClick={handleImageClick}
                    />
                )}
                {selectedLocation && !selectedCamera && (
                    <div className="bg-white rounded-lg shadow-lg p-4 mt-2">
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
                    isDrawerOpen={isStatsOpen}
                    isModalOpen={!!modalImageUrl}
                    onOpenDrawer={() => setIsStatsOpen(true)}
                />
            </div>
            {modalImageUrl && (
                <ImageModal
                    key={modalImageUrl}
                    imageUrl={modalImageUrl}
                    onClose={() => setModalImageUrl(null)}
                />
            )}
            <CityStatsDrawer open={isStatsOpen} onOpenChange={setIsStatsOpen} />
        </div>
    )
}
