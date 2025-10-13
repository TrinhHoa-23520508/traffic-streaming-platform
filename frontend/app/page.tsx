"use client"

import dynamic from "next/dynamic";
import { useMemo, useState, useEffect } from "react";
import SearchBox from "@/component/search";
import CameraInfoCard from "@/component/camera-info-card";
import type { Camera } from "@/types/camera";

export default function Page() {
    const [mapCenter, setMapCenter] = useState<[number, number]>([10.8231, 106.6297]);
    const [locationName, setLocationName] = useState<string>("Ho Chi Minh City");
    const [mapZoom, setMapZoom] = useState<number>(13);
    const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<{lat: number, lon: number, name: string} | null>(null);
    const [imageRefreshKey, setImageRefreshKey] = useState<number>(Date.now());

    const Map = useMemo(() => dynamic(
        () => import('@/component/map'),
        {
            loading: () => <p>A map is loading</p>,
            ssr: false
        }
    ), [])

    // Auto-refresh camera snapshot every 20 seconds
    useEffect(() => {
        if (!selectedCamera) return;

        const interval = setInterval(() => {
            setImageRefreshKey(Date.now());
        }, 20000); // 20 seconds

        return () => clearInterval(interval);
    }, [selectedCamera]);

    const handleLocationSelect = (lat: number, lon: number, name: string) => {
        setMapCenter([lat, lon]);
        setLocationName(name);
        setMapZoom(15);
        setSelectedCamera(null);
        setSelectedLocation({lat, lon, name});
    };

    const handleCameraClick = (camera: Camera) => {
        setSelectedCamera(camera);
        setMapCenter([camera.loc.coordinates[1], camera.loc.coordinates[0]]);
        setLocationName(camera.name);
        setMapZoom(17);
        setSelectedLocation(null);
    };

    return (
        <div className="fixed inset-0 h-screen w-screen overflow-visible">
            <div className="fixed top-6 left-6 z-[1000] flex flex-col gap-2 w-[340px] max-w-full pointer-events-auto">
                <div className="bg-white rounded-lg shadow-lg p-2 flex items-center">
                    <SearchBox onSelectLocation={handleLocationSelect} />
                </div>
                {selectedCamera && (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden mt-2">
                        {/* Camera Snapshot */}
                        {selectedCamera.liveviewUrl && (
                            <div className="w-full bg-gray-900 relative">
                                <img 
                                    key={imageRefreshKey}
                                    src={`https://api.notis.vn/v4/${selectedCamera.liveviewUrl}?t=${imageRefreshKey}`}
                                    alt={selectedCamera.name}
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
                                <h3 className="text-base font-semibold text-gray-700">Camera</h3>
                                <button onClick={() => setSelectedCamera(null)} className="text-gray-400 hover:text-gray-600">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="font-medium text-gray-800 mb-2">{selectedCamera.name}</div>
                            <div className="space-y-1 text-xs text-gray-600">
                                <p><strong>ID:</strong> {selectedCamera.id}</p>
                                <p><strong>Quận:</strong> {selectedCamera.dist}</p>
                                <p><strong>IP:</strong> {selectedCamera.values.ip}</p>
                                <p><strong>PTZ:</strong> {selectedCamera.ptz ? 'Có' : 'Không'}</p>
                                <p><strong>Góc:</strong> {selectedCamera.angle}°</p>
                                <p><strong>Tọa độ:</strong> {selectedCamera.loc.coordinates[1].toFixed(6)}, {selectedCamera.loc.coordinates[0].toFixed(6)}</p>
                            </div>
                            {selectedCamera.liveviewUrl && (
                                <button className="mt-3 w-full text-xs bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
                                    onClick={() => window.open(`https://api.notis.vn/v4/${selectedCamera.liveviewUrl}`, '_blank')}
                                >🎥 Xem Live Stream</button>
                            )}
                        </div>
                    </div>
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
                />
            </div>
        </div>
    )
}
