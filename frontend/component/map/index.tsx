// src/components/map/index.tsx

"use client"

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import { LatLngExpression, LatLngTuple } from 'leaflet';
import CameraMarkers from "@/component/camera-markers";
import type { Camera } from "@/types/camera";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

interface MapProps {
    posix: LatLngExpression | LatLngTuple,
    zoom?: number,
    locationName?: string;
    onCameraClick?: (camera: Camera) => void;
    selectedCamera?: Camera | null;
    selectedLocation?: {lat: number, lon: number, name: string} | null;
}

const defaults = {
    zoom: 19,
}

// Component to update map center when location changes
function ChangeMapView({ center, zoom }: { center: LatLngExpression, zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
}

const Map = (props: MapProps) => {
    const { zoom = defaults.zoom, posix, locationName, onCameraClick, selectedCamera, selectedLocation } = props

    useEffect(() => {
        if (typeof window !== 'undefined') {
            require('leaflet-defaulticon-compatibility');
        }
    }, []);

    return (
        <MapContainer
            center={posix}
            zoom={zoom}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
        >
            <ZoomControl position="bottomright" />
            <ChangeMapView center={posix} zoom={zoom} />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* User's selected location marker (default Leaflet icon) - Only show when location selected, not camera */}
            {selectedLocation && !selectedCamera && (
                <Marker position={posix} draggable={false}>
                    <Popup>{locationName || "Hey ! I study here"}</Popup>
                </Marker>
            )}
            
            {/* All camera markers */}
            <CameraMarkers onCameraClick={onCameraClick} selectedCameraId={selectedCamera?._id} />
        </MapContainer>
    )
}

export default Map