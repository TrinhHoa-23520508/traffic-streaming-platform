// src/components/map/index.tsx

"use client"

import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Polyline, useMapEvents } from "react-leaflet";
import { LatLngExpression, LatLngTuple } from 'leaflet';
import L from 'leaflet';
import CameraMarkers from "@/components/camera-markers";
import { API_CONFIG } from "@/lib/api/config";
import type { Camera } from "@/types/camera";
import { FiNavigation, FiX, FiMapPin, FiZap, FiTrendingUp } from "react-icons/fi";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";

interface MapProps {
    posix: LatLngExpression | LatLngTuple,
    zoom?: number,
    locationName?: string;
    onCameraClick?: (camera: Camera) => void;
    selectedCamera?: Camera | null;
    selectedLocation?: { lat: number, lon: number, name: string } | null;
    imageRefreshKey?: number;
    isDrawerOpen?: boolean;
    onOpenDrawer?: () => void;
    isReportOpen?: boolean;
    onOpenReport?: () => void;
    isModalOpen?: boolean;
}

const defaults = {
    zoom: 19,
}

// Component to update map center when location changes
function ChangeMapView({ center, zoom }: { center: LatLngExpression, zoom: number }) {
    const map = useMap();
    const prevCenterRef = useRef<LatLngExpression | null>(null);
    const prevZoomRef = useRef<number | null>(null);

    useEffect(() => {
        const centerArray = Array.isArray(center) ? center : [center.lat, center.lng];
        const prevCenterArray = prevCenterRef.current
            ? (Array.isArray(prevCenterRef.current) ? prevCenterRef.current : [prevCenterRef.current.lat, prevCenterRef.current.lng])
            : null;

        // Check if center actually changed
        const centerChanged = !prevCenterArray ||
            centerArray[0] !== prevCenterArray[0] ||
            centerArray[1] !== prevCenterArray[1];

        // Check if zoom actually changed
        const zoomChanged = prevZoomRef.current !== zoom;

        // Only update if something actually changed
        if (centerChanged || zoomChanged) {
            // Use flyTo for smooth animation
            map.flyTo(center, zoom, {
                duration: 0.8, // Animation duration in seconds
                easeLinearity: 0.25
            });
        }

        // Update refs
        prevCenterRef.current = center;
        prevZoomRef.current = zoom;
    }, [center, zoom, map]);

    return null;
}

function ZoomLogger() {
    const map = useMap();

    useEffect(() => {
        const handleZoom = () => {
            console.log('🗺️ Map zoom level:', map.getZoom());
        };

        map.on('zoomend', handleZoom);
        return () => {
            map.off('zoomend', handleZoom);
        };
    }, [map]);

    return null;
}

const Map = (props: MapProps) => {
    const { zoom = defaults.zoom, posix, locationName, onCameraClick, selectedCamera, selectedLocation, isDrawerOpen, onOpenDrawer, isReportOpen, onOpenReport, isModalOpen } = props
    const [heatEnabled, setHeatEnabled] = useState<boolean>(false);
    const [routingEnabled, setRoutingEnabled] = useState<boolean>(false);
    const [cameras, setCameras] = useState<any[]>([]);
    const [routingCameraClickHandler, setRoutingCameraClickHandler] = useState<((camera: any) => void) | null>(null);
    const [activeRouteCoordinates, setActiveRouteCoordinates] = useState<number[][] | null>(null);

    // Handle camera selection from Report Dialog
    const handleReportCameraSelect = useCallback((cameraId: string) => {
        // Check both id and _id to match camera data structure
        const camera = cameras.find(c => c.id === cameraId || c._id === cameraId);
        if (camera && onCameraClick) {
            onCameraClick(camera);
        }
    }, [cameras, onCameraClick]);

    // Memoized camera update handler
    const handleCamerasUpdate = useCallback((updatedCameras: any[]) => {
        setCameras(updatedCameras);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            require('leaflet-defaulticon-compatibility');
        }
    }, []);

    // Calculate right offset based on open drawers
    // CityStatsDrawer is w-160 (640px) + 16px margin = 656px
    // ReportDialog is w-[500px] + 16px margin = 516px
    const rightOffset = isDrawerOpen ? 656 : (isReportOpen ? 516 : 16);

    return (
        <MapContainer
            center={posix}
            zoom={zoom}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            // Performance optimizations for smoother map interactions
            preferCanvas={true}
        >
            <ZoomControl position="bottomright" />
            <ChangeMapView center={posix} zoom={zoom} />
            <TileLayer
                url={API_CONFIG.OPENSTREETMAP_TILE_URL}
                // Tile layer performance optimizations
                keepBuffer={4}
            />

            {/* User's selected location marker (default Leaflet icon) - Only show when location selected, not camera */}
            {selectedLocation && !selectedCamera && !heatEnabled && (
                <Marker position={posix} draggable={false}>
                    <Popup>{locationName || "Hey ! I study here"}</Popup>
                </Marker>
            )}

            {/* All camera markers */}
            <CameraMarkers
                onCameraClick={onCameraClick}
                selectedCameraId={selectedCamera?._id}
                onCamerasUpdate={handleCamerasUpdate}
                routingMode={routingEnabled}
                onRoutingCameraClick={routingCameraClickHandler}
                heatEnabled={heatEnabled}
                routeCoordinates={activeRouteCoordinates}
            />

            <div className="absolute top-4 right-4 z-[1000] pointer-events-auto transition-all duration-300 ease-in-out">
                <div className="flex items-center gap-2">
                    <div className="bg-white rounded-lg shadow p-2 text-sm flex items-center gap-2">
                        <label className="flex items-center gap-2 select-none cursor-pointer">
                            <input type="checkbox" checked={heatEnabled} onChange={(e) => setHeatEnabled(e.target.checked)} />
                            <span className="text-red-500 font-medium">Heatmap</span>
                        </label>
                    </div>

                    <button
                        onClick={() => {
                            const newState = !routingEnabled;
                            setRoutingEnabled(newState);
                            if (!newState) {
                                setActiveRouteCoordinates(null);
                            }
                        }}
                        className={`p-2 rounded-lg shadow transition-colors ${routingEnabled ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                        title="Toggle Routing Mode"
                    >
                        <FiNavigation size={18} />
                    </button>
                </div>
            </div>

            {/* Heat layer manager (client-only) */}
            {typeof window !== 'undefined' && (
                <HeatLayerManager enabled={heatEnabled} cameras={cameras} imageRefreshKey={(props as any).imageRefreshKey} />
            )}

            {/* Routing Manager */}
            {routingEnabled && (
                <RoutingManager 
                    cameras={cameras} 
                    onCancel={() => {
                        setRoutingEnabled(false);
                        setActiveRouteCoordinates(null);
                    }}
                    onSetCameraClickHandler={setRoutingCameraClickHandler}
                    onRouteChange={setActiveRouteCoordinates}
                />
            )}

        </MapContainer>
    )
}

export default Map

// --- Routing Components ---

type RouteVariant = 'shortest' | 'fastest';

interface TrafficRouteSegment {
    positions: LatLngTuple[];
    color: string;
}

interface RouteAnalysis {
    id: number;
    segments: TrafficRouteSegment[];
    distance: number;
    duration: number;
    adjustedDuration: number;
    trafficScore: number;
    coordinates: number[][];
    isCustomPath?: boolean; // Flag for A* generated path
}

const TRAFFIC_DELAY_SCORE_CAP = 50;

const calculateTrafficDelayMultiplier = (trafficScore: number) => {
    const normalized = Math.min(Math.max(trafficScore, 0), TRAFFIC_DELAY_SCORE_CAP) / TRAFFIC_DELAY_SCORE_CAP;
    // Up to ~80% slowdown when traffic is extremely heavy
    return 1 + normalized * 0.8;
};

// ==================== A* PATHFINDING ON OSM ROAD NETWORK ====================
// Fetches real road data from OpenStreetMap and runs A* with traffic weights

interface RoadNode {
    id: number;
    lat: number;
    lng: number;
}

interface RoadEdge {
    from: number;
    to: number;
    distance: number;
    trafficDensity: number;
}

interface RoadGraph {
    nodes: globalThis.Map<number, RoadNode>;
    edges: globalThis.Map<number, RoadEdge[]>;
}

interface AStarRoadNode {
    nodeId: number;
    g: number;
    h: number;
    f: number;
    parent: number | null;
}

// Haversine distance in meters
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Fetch road network from Overpass API
async function fetchRoadNetwork(start: L.LatLng, end: L.LatLng): Promise<{ nodes: RoadNode[], ways: { nodes: number[] }[] } | null> {
    const padding = 0.015; // ~1.5km padding
    const minLat = Math.min(start.lat, end.lat) - padding;
    const maxLat = Math.max(start.lat, end.lat) + padding;
    const minLng = Math.min(start.lng, end.lng) - padding;
    const maxLng = Math.max(start.lng, end.lng) + padding;
    
    const query = `[out:json][timeout:10];(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified)$"](${minLat},${minLng},${maxLat},${maxLng}););out body;>;out skel qt;`;
    
    try {
        console.log('🗺️ Fetching OSM road network...');
        const response = await fetch(API_CONFIG.OVERPASS_API_URL, {
            method: 'POST',
            body: query
        });
        
        if (!response.ok) throw new Error('Overpass API error');
        const data = await response.json();
        
        const nodes: RoadNode[] = [];
        const ways: { nodes: number[] }[] = [];
        
        data.elements.forEach((el: any) => {
            if (el.type === 'node') {
                nodes.push({ id: el.id, lat: el.lat, lng: el.lon });
            } else if (el.type === 'way' && el.nodes) {
                ways.push({ nodes: el.nodes });
            }
        });
        
        console.log(`📍 Got ${nodes.length} road nodes and ${ways.length} ways from OSM`);
        return { nodes, ways };
    } catch (error) {
        console.error('Error fetching road network:', error);
        return null;
    }
}

// Get traffic density from nearby cameras (within 300m)
function getNearbyTrafficDensity(lat: number, lng: number, cameras: any[]): number {
    const INFLUENCE_RADIUS = 200;
    let totalWeight = 0;
    let weightedDensity = 0;
    
    cameras.forEach(cam => {
        const camLat = cam.loc.coordinates[1];
        const camLng = cam.loc.coordinates[0];
        const dist = haversineDistance(lat, lng, camLat, camLng);
        
        if (dist < INFLUENCE_RADIUS) {
            const weight = 1 - (dist / INFLUENCE_RADIUS);
            totalWeight += weight;
            weightedDensity += (cam.density || 0) * weight;
        }
    });
    
    return totalWeight > 0 ? weightedDensity / totalWeight : 0;
}

// Build graph from OSM data with traffic weights
function buildRoadGraph(
    osmData: { nodes: RoadNode[], ways: { nodes: number[] }[] },
    cameras: any[],
    start: L.LatLng,
    end: L.LatLng
): { graph: RoadGraph, startNodeId: number, endNodeId: number } {
    const nodeMap = new globalThis.Map<number, RoadNode>();
    const edges = new globalThis.Map<number, RoadEdge[]>();
    
    osmData.nodes.forEach(node => {
        nodeMap.set(node.id, node);
        edges.set(node.id, []);
    });
    
    const START_ID = -1;
    const END_ID = -2;
    nodeMap.set(START_ID, { id: START_ID, lat: start.lat, lng: start.lng });
    nodeMap.set(END_ID, { id: END_ID, lat: end.lat, lng: end.lng });
    edges.set(START_ID, []);
    edges.set(END_ID, []);
    
    // Build edges from ways (bidirectional)
    osmData.ways.forEach(way => {
        for (let i = 0; i < way.nodes.length - 1; i++) {
            const fromId = way.nodes[i];
            const toId = way.nodes[i + 1];
            const fromNode = nodeMap.get(fromId);
            const toNode = nodeMap.get(toId);
            
            if (!fromNode || !toNode) continue;
            
            const distance = haversineDistance(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
            const midLat = (fromNode.lat + toNode.lat) / 2;
            const midLng = (fromNode.lng + toNode.lng) / 2;
            const trafficDensity = getNearbyTrafficDensity(midLat, midLng, cameras);
            
            edges.get(fromId)!.push({ from: fromId, to: toId, distance, trafficDensity });
            edges.get(toId)!.push({ from: toId, to: fromId, distance, trafficDensity });
        }
    });
    
    // Connect start to nearest road nodes
    const startConnections = osmData.nodes
        .map(n => ({ node: n, dist: haversineDistance(start.lat, start.lng, n.lat, n.lng) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5);
    
    startConnections.forEach(({ node, dist }) => {
        edges.get(START_ID)!.push({ from: START_ID, to: node.id, distance: dist, trafficDensity: 0 });
    });
    
    // Connect end to nearest road nodes
    const endConnections = osmData.nodes
        .map(n => ({ node: n, dist: haversineDistance(end.lat, end.lng, n.lat, n.lng) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 5);
    
    endConnections.forEach(({ node, dist }) => {
        edges.get(node.id)!.push({ from: node.id, to: END_ID, distance: dist, trafficDensity: 0 });
    });
    
    return { graph: { nodes: nodeMap, edges }, startNodeId: START_ID, endNodeId: END_ID };
}

// A* pathfinding on road graph
function aStarOnRoadGraph(graph: RoadGraph, startId: number, endId: number): number[] | null {
    const endNode = graph.nodes.get(endId);
    if (!endNode) return null;
    
    const openSet: AStarRoadNode[] = [];
    const closedSet = new Set<number>();
    const gScores = new globalThis.Map<number, number>();
    const parents = new globalThis.Map<number, number>();
    
    gScores.set(startId, 0);
    
    const startNode = graph.nodes.get(startId)!;
    openSet.push({
        nodeId: startId,
        g: 0,
        h: haversineDistance(startNode.lat, startNode.lng, endNode.lat, endNode.lng),
        f: haversineDistance(startNode.lat, startNode.lng, endNode.lat, endNode.lng),
        parent: null
    });
    
    let iterations = 0;
    const MAX_ITERATIONS = 100000;
    
    while (openSet.length > 0 && iterations < MAX_ITERATIONS) {
        iterations++;
        
        // Get node with lowest f (use binary search position for better perf)
        let minIdx = 0;
        for (let i = 1; i < openSet.length; i++) {
            if (openSet[i].f < openSet[minIdx].f) minIdx = i;
        }
        const current = openSet.splice(minIdx, 1)[0];
        
        if (current.nodeId === endId) {
            const path: number[] = [];
            let nodeId: number | undefined = endId;
            while (nodeId !== undefined) {
                path.unshift(nodeId);
                nodeId = parents.get(nodeId);
            }
            console.log(`🎯 A* found path with ${path.length} nodes in ${iterations} iterations`);
            return path;
        }
        
        closedSet.add(current.nodeId);
        
        const neighbors = graph.edges.get(current.nodeId) || [];
        
        for (const edge of neighbors) {
            if (closedSet.has(edge.to)) continue;
            
            // Traffic multiplier: 1.0 to 5.0 based on density (aggressive traffic avoidance)
            const trafficMultiplier = 1 + Math.min(edge.trafficDensity, 30) / 30 * 4;
            const edgeCost = edge.distance * trafficMultiplier;
            
            const tentativeG = current.g + edgeCost;
            const existingG = gScores.get(edge.to) ?? Infinity;
            
            if (tentativeG < existingG) {
                gScores.set(edge.to, tentativeG);
                parents.set(edge.to, current.nodeId);
                
                const neighborNode = graph.nodes.get(edge.to);
                if (!neighborNode) continue;
                
                const h = haversineDistance(neighborNode.lat, neighborNode.lng, endNode.lat, endNode.lng);
                
                const existingIdx = openSet.findIndex(n => n.nodeId === edge.to);
                const newNode: AStarRoadNode = { nodeId: edge.to, g: tentativeG, h, f: tentativeG + h, parent: current.nodeId };
                
                if (existingIdx >= 0) {
                    openSet[existingIdx] = newNode;
                } else {
                    openSet.push(newNode);
                }
            }
        }
    }
    
    console.warn(`⚠️ A* did not find path after ${iterations} iterations`);
    return null;
}

// Main function: Find traffic-optimized route using OSM road network
async function findTrafficOptimizedRoute(
    start: L.LatLng,
    end: L.LatLng,
    cameras: any[]
): Promise<{ coordinates: number[][], distance: number, trafficScore: number } | null> {
    const osmData = await fetchRoadNetwork(start, end);
    if (!osmData || osmData.nodes.length === 0) {
        console.warn('❌ Could not fetch road network');
        return null;
    }
    
    const { graph, startNodeId, endNodeId } = buildRoadGraph(osmData, cameras, start, end);
    
    const path = aStarOnRoadGraph(graph, startNodeId, endNodeId);
    if (!path) {
        console.warn('❌ A* could not find a path');
        return null;
    }
    
    // Convert to coordinates
    const coordinates: number[][] = path
        .map(id => graph.nodes.get(id))
        .filter((n): n is RoadNode => n !== undefined)
        .map(n => [n.lng, n.lat]);
    
    // Calculate total distance and average traffic
    let totalDistance = 0;
    let totalTraffic = 0;
    for (let i = 0; i < coordinates.length - 1; i++) {
        totalDistance += haversineDistance(coordinates[i][1], coordinates[i][0], coordinates[i+1][1], coordinates[i+1][0]);
        const midLat = (coordinates[i][1] + coordinates[i+1][1]) / 2;
        const midLng = (coordinates[i][0] + coordinates[i+1][0]) / 2;
        totalTraffic += getNearbyTrafficDensity(midLat, midLng, cameras);
    }
    
    const avgTrafficScore = coordinates.length > 1 ? totalTraffic / (coordinates.length - 1) : 0;
    
    return { coordinates, distance: totalDistance, trafficScore: avgTrafficScore };
}

// ==================== END A* PATHFINDING ====================

function RoutingManager({ cameras, onCancel, onSetCameraClickHandler, onRouteChange }: { cameras: any[], onCancel: () => void, onSetCameraClickHandler: (handler: ((camera: any) => void) | null) => void, onRouteChange?: (coordinates: number[][] | null) => void }) {
    const [startPoint, setStartPoint] = useState<L.LatLng | null>(null);
    const [endPoint, setEndPoint] = useState<L.LatLng | null>(null);
    const [routeOptions, setRouteOptions] = useState<{ shortest?: RouteAnalysis, fastest?: RouteAnalysis }>({});
    const [focusedRouteType, setFocusedRouteType] = useState<RouteVariant | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const map = useMap();

    const fetchRoute = useCallback(async (start: L.LatLng, end: L.LatLng) => {
        console.log('🚀 Fetching routes from:', start, 'to:', end);
        setLoading(true);
        setError(null);
        setRouteOptions({});
        setFocusedRouteType(null);
        
        try {
            // ========== STEP 1: Get OSRM alternatives ==========
            const osrmUrl = `${API_CONFIG.OSRM_API_URL}/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&alternatives=3`;
            console.log('🌐 Fetching OSRM routes with alternatives...');
            
            const osrmResponse = await fetch(osrmUrl);
            const osrmData = await osrmResponse.json();
            
            if (osrmData.code !== 'Ok' || !osrmData.routes || osrmData.routes.length === 0) {
                setError('No routes available. Try different start/end points.');
                return;
            }
            
            // Process all OSRM routes
            const osrmRoutes: RouteAnalysis[] = osrmData.routes.map((route: any, index: number) => {
                const coordinates = route.geometry.coordinates;
                const segments = processTrafficRoute(coordinates, cameras);
                const trafficScore = calculateRouteTrafficScore(coordinates, cameras);
                
                return {
                    id: index,
                    segments,
                    trafficScore,
                    distance: route.distance,
                    duration: route.duration,
                    adjustedDuration: route.duration * calculateTrafficDelayMultiplier(trafficScore),
                    coordinates,
                    isCustomPath: false
                };
            });
            
            console.log(`📍 Got ${osrmRoutes.length} OSRM routes`);
            osrmRoutes.forEach((r, i) => {
                console.log(`  Route ${i}: ${(r.distance/1000).toFixed(2)}km, traffic: ${r.trafficScore.toFixed(1)}, adjusted: ${Math.round(r.adjustedDuration/60)}min`);
            });
            
            // ========== STEP 2: Find shortest (by distance) and fastest (by adjusted duration) ==========
            const shortestRoute = osrmRoutes.reduce((prev, curr) => 
                curr.distance < prev.distance ? curr : prev
            , osrmRoutes[0]);
            
            let fastestRoute = osrmRoutes.reduce((prev, curr) => 
                curr.adjustedDuration < prev.adjustedDuration ? curr : prev
            , osrmRoutes[0]);
            
            // ========== STEP 3: Always try A* on OSM road network to find lower-traffic route ==========
            if (cameras.length > 0) {
                console.log('🧠 Running A* on OSM road network to find traffic-optimized route...');
                
                try {
                    const aStarResult = await findTrafficOptimizedRoute(start, end, cameras);
                    
                    if (aStarResult && aStarResult.coordinates.length >= 2) {
                        const segments = processTrafficRoute(aStarResult.coordinates, cameras);
                        // Estimate duration based on distance (assume 40 km/h average)
                        const estimatedDuration = aStarResult.distance / (40 / 3.6); // 40 km/h in m/s
                        
                        const aStarRoute: RouteAnalysis = {
                            id: 100,
                            segments,
                            trafficScore: aStarResult.trafficScore,
                            distance: aStarResult.distance,
                            duration: estimatedDuration,
                            adjustedDuration: estimatedDuration * calculateTrafficDelayMultiplier(aStarResult.trafficScore),
                            coordinates: aStarResult.coordinates,
                            isCustomPath: true
                        };
                        
                        console.log(`🚀 A* OSM route: ${(aStarRoute.distance/1000).toFixed(2)}km, traffic: ${aStarRoute.trafficScore.toFixed(1)}, adjusted: ${Math.round(aStarRoute.adjustedDuration/60)}min`);
                        
                        // Use A* route if it has lower traffic or is faster
                        const trafficImprovement = shortestRoute.trafficScore - aStarRoute.trafficScore;
                        const distanceIncrease = (aStarRoute.distance - shortestRoute.distance) / shortestRoute.distance;
                        const durationImprovement = shortestRoute.adjustedDuration - aStarRoute.adjustedDuration;
                        
                        // Accept A* route if it provides any benefit - show both options to user
                        if (durationImprovement > 0 || trafficImprovement > 0) {
                            // A* route has some benefit - show it as alternative
                            fastestRoute = aStarRoute;
                            console.log(`✅ A* route accepted: ${Math.round(durationImprovement/60)}min ${durationImprovement > 0 ? 'faster' : 'slower'}, traffic ${trafficImprovement > 0 ? '-' : '+'}${Math.abs(trafficImprovement).toFixed(1)}`);
                        } else {
                            console.log(`❌ A* route rejected: duration ${Math.round(durationImprovement/60)}min, traffic ${trafficImprovement.toFixed(1)}, distance +${(distanceIncrease*100).toFixed(0)}%`);
                        }
                    }
                } catch (e) {
                    console.error('Error with A* routing:', e);
                }
            }
            
            // ========== STEP 4: Determine which routes to show ==========
            const isSameRoute = shortestRoute.id === fastestRoute.id;
            // Show both routes if they are different
            const showBothRoutes = !isSameRoute;
            
            // Ensure shortest is marked correctly
            shortestRoute.isCustomPath = false;
            
            setRouteOptions({
                shortest: shortestRoute,
                fastest: showBothRoutes ? fastestRoute : undefined
            });
            
            // Default focus to fastest if it's better, otherwise shortest
            const fastestIsBetter = fastestRoute.adjustedDuration < shortestRoute.adjustedDuration;
            const defaultFocus: RouteVariant = (showBothRoutes && fastestIsBetter) ? 'fastest' : 'shortest';
            setFocusedRouteType(defaultFocus);
            
            // Log final comparison
            console.log('🚗 Final Route Selection:');
            console.log(`  📍 Shortest: ${(shortestRoute.distance/1000).toFixed(2)}km, ~${Math.round(shortestRoute.adjustedDuration/60)}min (traffic: ${shortestRoute.trafficScore.toFixed(1)})`);
            if (showBothRoutes) {
                const timeDiff = Math.round((shortestRoute.adjustedDuration - fastestRoute.adjustedDuration) / 60);
                console.log(`  🚀 Alternative: ${(fastestRoute.distance/1000).toFixed(2)}km, ~${Math.round(fastestRoute.adjustedDuration/60)}min (traffic: ${fastestRoute.trafficScore.toFixed(1)}) - ${timeDiff > 0 ? `Saves ${timeDiff}min` : `${Math.abs(timeDiff)}min longer`} ${fastestRoute.isCustomPath ? '[A* optimized]' : ''}`);
            } else {
                console.log(`  ℹ️ No alternative route found`);
            }
            
            // Fit bounds to show route
            const bounds = L.latLngBounds([start, end]);
            const focusRoute = (defaultFocus === 'fastest' && fastestRoute) 
                ? fastestRoute.coordinates 
                : shortestRoute.coordinates;
            focusRoute?.forEach((coord: any) => bounds.extend([coord[1], coord[0]]));
            map.fitBounds(bounds, { padding: [50, 50] });
            
        } catch (error) {
            console.error("❌ Error fetching route:", error);
            setError('Unable to fetch route. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [cameras, map]);

    // Set up camera click handler for routing mode
    useEffect(() => {
        const handleCameraClick = (camera: any) => {
            const cameraLatLng = L.latLng(camera.loc.coordinates[1], camera.loc.coordinates[0]);
            if (!startPoint) {
                setStartPoint(cameraLatLng);
            } else if (!endPoint) {
                setEndPoint(cameraLatLng);
                fetchRoute(startPoint, cameraLatLng);
            }
        };
        onSetCameraClickHandler(() => handleCameraClick);
        return () => {
            onSetCameraClickHandler(null);
        };
    }, [startPoint, endPoint, onSetCameraClickHandler, fetchRoute]);

    // Handle map clicks
    useMapEvents({
        click(e) {
            console.log('🗺️ Map clicked at:', e.latlng, 'startPoint:', startPoint, 'endPoint:', endPoint);
            if (!startPoint) {
                setStartPoint(e.latlng);
                console.log('✅ Start point set');
            } else if (!endPoint) {
                setEndPoint(e.latlng);
                console.log('✅ End point set, fetching route...');
                fetchRoute(startPoint, e.latlng);
            }
        }
    });

    const switchToRoute = (type: RouteVariant) => {
        if (routeOptions[type]) {
            setFocusedRouteType(type);
        }
    };

    // Notify parent about active route coordinates
    useEffect(() => {
        if (onRouteChange) {
            const activeRoute = focusedRouteType === 'fastest' 
                ? routeOptions.fastest 
                : routeOptions.shortest;
            onRouteChange(activeRoute?.coordinates || null);
        }
    }, [focusedRouteType, routeOptions, onRouteChange]);

    const reset = () => {
        setStartPoint(null);
        setEndPoint(null);
        setRouteOptions({});
        setFocusedRouteType(null);
        setError(null);
        if (onRouteChange) onRouteChange(null);
    };

    const shortestRoute = routeOptions.shortest;
    const fastestRoute = routeOptions.fastest;
    const hasRoutes = Boolean(shortestRoute);
    const isSameRoute = Boolean(shortestRoute && fastestRoute && fastestRoute.id === shortestRoute.id);
    const shouldRenderFastest = Boolean(fastestRoute && (!shortestRoute || fastestRoute.id !== shortestRoute.id));
    const derivedActiveType: RouteVariant | null = focusedRouteType
        ?? (fastestRoute && (!shortestRoute || fastestRoute.id !== shortestRoute.id)
            ? 'fastest'
            : shortestRoute
                ? 'shortest'
                : null);

    return (
        <>
            {/* Instructions / Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-[1000] pointer-events-auto">
                {!endPoint ? (
                    <div className="bg-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-4">
                        <div className="text-sm font-medium">
                            {!startPoint ? "🗺️ Click map or camera to set Start" : "🎯 Click map or camera to set Destination"}
                        </div>
                        {startPoint && (
                            <button onClick={reset} className="text-gray-500 hover:text-gray-700 text-sm">
                                Reset
                            </button>
                        )}
                        <button onClick={onCancel} className="text-red-500 hover:text-red-700">
                            <FiX size={18} />
                        </button>
                    </div>
                ) : loading ? (
                    <div className="bg-white px-4 py-3 rounded-lg shadow-lg">
                        <div className="text-sm font-medium">🔍 Finding best routes...</div>
                    </div>
                ) : error ? (
                    <div className="bg-white px-4 py-3 rounded-lg shadow-lg">
                        <div className="text-sm font-medium text-red-600">{error}</div>
                        <button onClick={reset} className="text-xs text-gray-500 hover:text-gray-700 mt-1">Try again</button>
                    </div>
                ) : hasRoutes && (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="px-4 py-2 bg-gray-50 border-b flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-600">ROUTE OPTIONS</span>
                            <div className="flex gap-2">
                                <button onClick={reset} className="text-gray-500 hover:text-gray-700 text-xs">
                                    Reset
                                </button>
                                <button onClick={onCancel} className="text-red-500 hover:text-red-700">
                                    <FiX size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 p-3">
                            {shortestRoute && (
                                <RouteCard
                                    type="shortest"
                                    route={shortestRoute}
                                    isActive={derivedActiveType === 'shortest'}
                                    onSelect={() => switchToRoute('shortest')}
                                    comparisonRoute={fastestRoute}
                                />
                            )}
                            {fastestRoute && (
                                <RouteCard
                                    type="fastest"
                                    route={fastestRoute}
                                    isActive={derivedActiveType === 'fastest'}
                                    onSelect={() => switchToRoute('fastest')}
                                    comparisonRoute={shortestRoute}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Start Marker */}
            {startPoint && (
                <Marker position={startPoint} icon={createIcon('green')} />
            )}

            {/* End Marker */}
            {endPoint && (
                <Marker position={endPoint} icon={createIcon('red')} />
            )}

            {/* Route Segments */}
            {/* When both routes are the same, render based on the active type. Otherwise, render both with appropriate logic */}
            {isSameRoute ? (
                renderRoutePolyline(derivedActiveType === 'shortest' ? shortestRoute : fastestRoute, derivedActiveType || 'shortest', derivedActiveType)
            ) : (
                <>
                    {renderRoutePolyline(shortestRoute, 'shortest', derivedActiveType)}
                    {shouldRenderFastest && renderRoutePolyline(fastestRoute, 'fastest', derivedActiveType)}
                </>
            )}
        </>
    );
}

// Helper to create simple colored icons
const createIcon = (color: string) => L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

// Calculate overall traffic score for a route (lower is better)
function calculateRouteTrafficScore(coordinates: number[][], cameras: any[]): number {
    const path = coordinates.map(coord => L.latLng(coord[1], coord[0]));
    let totalScore = 0;
    let sampledPoints = 0;
    const SAMPLE_INTERVAL = 10; // Sample every 10th point for performance

    for (let i = 0; i < path.length; i += SAMPLE_INTERVAL) {
        const point = path[i];
        
        // Find nearest camera
        let nearestCamera = null;
        let minDistance = Infinity;

        cameras.forEach(camera => {
            const camLatLng = L.latLng(camera.loc.coordinates[1], camera.loc.coordinates[0]);
            const dist = point.distanceTo(camLatLng);
            if (dist < minDistance) {
                minDistance = dist;
                nearestCamera = camera;
            }
        });

        // Only count if camera is nearby (within 500m)
        if (nearestCamera && minDistance < 500) {
            const density = (nearestCamera as any).density || 0;
            // Weight by inverse distance (closer = more influence)
            const distanceWeight = 1 / (1 + minDistance / 100);
            totalScore += density * distanceWeight;
            sampledPoints++;
        }
    }

    // Return weighted average, or 0 if no traffic data
    return sampledPoints > 0 ? totalScore / sampledPoints : 0;
}

// Logic to split route and color based on traffic
function processTrafficRoute(coordinates: number[][], cameras: any[]): TrafficRouteSegment[] {
    const segments: TrafficRouteSegment[] = [];
    
    // Convert GeoJSON [lon, lat] to Leaflet [lat, lon]
    const path = coordinates.map(coord => L.latLng(coord[1], coord[0]));

    // We'll create small segments and check nearest camera for each
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i+1];
        const midPoint = L.latLng(
            (p1.lat + p2.lat) / 2,
            (p1.lng + p2.lng) / 2
        );

        // Find nearest camera
        let nearestCamera = null;
        let minDistance = Infinity;

        cameras.forEach(camera => {
            const camLatLng = L.latLng(camera.loc.coordinates[1], camera.loc.coordinates[0]);
            const dist = midPoint.distanceTo(camLatLng);
            if (dist < minDistance) {
                minDistance = dist;
                nearestCamera = camera;
            }
        });

        // Determine color
        let color = '#3b82f6'; // Default Blue (No data/Far)
        
        // Only apply traffic color if camera is within 500m
        if (nearestCamera && minDistance < 500) {
            const density = (nearestCamera as any).density || 0;
            if (density > 40) color = '#ef4444'; // Red - Heavy
            else if (density > 20) color = '#f97316'; // Orange - Moderate
            else if (density > 10) color = '#eab308'; // Yellow - Light
            else color = '#22c55e'; // Green - Clear
        }

        // Optimization: Merge with previous segment if color is same
        if (segments.length > 0 && segments[segments.length - 1].color === color) {
            segments[segments.length - 1].positions.push([p2.lat, p2.lng]);
        } else {
            segments.push({
                positions: [
                    [p1.lat, p1.lng],
                    [p2.lat, p2.lng]
                ],
                color: color
            });
        }
    }

    return segments;
}

// HeatLayerManager component: client-only, creates a heat layer using leaflet.heat
function HeatLayerManager({ enabled, cameras, imageRefreshKey }: { enabled: boolean, cameras: any[], imageRefreshKey?: number }) {
    const map = useMap();
    const heatLayerRef = useRef<any | null>(null);
    const [zoomLevel, setZoomLevel] = useState(() => map.getZoom());

    useEffect(() => {
        const handleZoom = () => {
            const nextZoom = map.getZoom();
            setZoomLevel(nextZoom);
        };

        map.on('zoomend', handleZoom);
        handleZoom();
        return () => {
            map.off('zoomend', handleZoom);
        };
    }, [map]);

    // Remove the old camera loading and random count generation - now using cameras from props
    // Update heat layer when cameras data changes
    useEffect(() => {
        if (cameras.length === 0) return;

        // Log camera densities when they update
        // console.log('🚗 Camera Density Update:', cameras.map((c: any) => ({
        //     id: c.id || c._id,
        //     name: c.name,
        //     density: c.density,
        //     coordinates: [c.loc.coordinates[1], c.loc.coordinates[0]]
        // })));

    }, [cameras, imageRefreshKey]);

    // Create/remove heat layer when enabled changes or camera data changes
    useEffect(() => {
        let heat: any = heatLayerRef.current;

        const update = async () => {
            // dynamic import to avoid SSR issues
            // @ts-ignore: no types for leaflet.heat
            await import('leaflet.heat');

            // Calculate max density to normalize or use a fixed scale
            // Using a fixed scale allows comparing traffic levels objectively
            // Assuming ~50 vehicles is "high traffic" for a single camera view
            const MAX_DENSITY_THRESHOLD = 50;

            // build points with [lat, lon, weight] using cameras from props
            const points = cameras.map((c: any) => {
                const lat = c.loc.coordinates[1];
                const lon = c.loc.coordinates[0];
                
                // Normalize weight: 0 to 1
                // We clamp it at 1.0 so extremely high traffic doesn't break the visual
                let weight = (c.density || 0) / MAX_DENSITY_THRESHOLD;
                if (weight > 1) weight = 1;
                if (weight < 0) weight = 0;
                
                return [lat, lon, weight];
            });

            // Dynamic configuration based on zoom
            const currentZoom = map.getZoom();
            
            // Adjust max intensity to prevent oversaturation when zooming out
            // When points overlap at low zoom, we need a higher threshold for "red"
            const baseZoom = 15;
            let dynamicMax = 1.0;
            if (currentZoom < baseZoom) {
                // Increase max intensity as we zoom out to compensate for point overlap
                dynamicMax = 1.0 + (baseZoom - currentZoom) * 0.8;
            }

            // Configuration for better visibility
            const options = {
                radius: 35, // Larger radius to cover more area and connect sparse points
                blur: 20,   // Smooth blur for better visual appeal
                maxZoom: currentZoom, // CRITICAL: Set maxZoom to current zoom to prevent fading when zooming out
                max: dynamicMax,   // Dynamic maximum intensity
                minOpacity: 0.3, // Ensure even low traffic is slightly visible
                gradient: {
                    0.0: 'blue',
                    0.2: 'cyan',
                    0.4: 'lime',
                    0.6: 'yellow',
                    0.8: 'orange',
                    1.0: 'red'
                }
            };

            if (enabled) {
                if (!heat) {
                    heat = (L as any).heatLayer(points, options);
                    heat.addTo(map as any);
                    heatLayerRef.current = heat;
                } else {
                    // Update points and options
                    heat.setLatLngs(points);
                    if (heat.setOptions) {
                        heat.setOptions(options);
                    }
                }
            } else {
                if (heat) {
                    try { map.removeLayer(heat); } catch (e) { }
                    heatLayerRef.current = null;
                }
            }
        };

        // Ensure global L is available
        if (typeof (window as any).L === 'undefined') {
            // try to require leaflet (should already be loaded)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            (window as any).L = require('leaflet');
        }

        update().catch(err => console.error('Failed to update heat layer', err));

        // cleanup
        return () => {
            // We don't remove the layer here to prevent flickering on re-renders
            // The layer is managed by the 'enabled' flag check above
        };
    }, [enabled, cameras, map, zoomLevel]); // Re-run when zoom changes to update maxZoom

    return null;
}

function renderRoutePolyline(route: RouteAnalysis | undefined, type: RouteVariant, focusedType: RouteVariant | null) {
    if (!route) return null;
    const isFocused = focusedType ? focusedType === type : type === 'fastest';

    return route.segments.map((segment, idx) => (
        <Polyline
            key={`${type}-${route.id}-${idx}`}
            positions={segment.positions}
            pathOptions={{
                color: segment.color,
                weight: isFocused ? 7 : 4,
                opacity: isFocused ? 0.95 : 0.45,
                dashArray: !isFocused && type === 'shortest' ? '8 8' : undefined,
                lineCap: 'round',
                lineJoin: 'round'
            }}
        />
    ));
}

interface RouteCardProps {
    type: RouteVariant;
    route: RouteAnalysis;
    isActive: boolean;
    onSelect: () => void;
    comparisonRoute?: RouteAnalysis;
}

function RouteCard({ type, route, isActive, onSelect, comparisonRoute }: RouteCardProps) {
    const isShortest = type === 'shortest';
    const title = isShortest ? 'Shortest Distance' : (route.isCustomPath ? 'AI Optimized Route' : 'Fastest Route');
    
    const distanceKm = (route.distance / 1000).toFixed(2);
    const noTrafficMinutes = Math.max(1, Math.round(route.duration / 60));
    const trafficMinutes = Math.max(1, Math.round(route.adjustedDuration / 60));
    const trafficClass = route.trafficScore < 10 ? 'text-green-600' : route.trafficScore < 25 ? 'text-yellow-600' : 'text-red-600';
    
    const comparisonExists = comparisonRoute !== undefined;
    const isSameRoute = comparisonExists && comparisonRoute!.id === route.id;
    let comparisonText: string | null = null;

    if (comparisonExists && !isSameRoute) {
        const distanceDeltaKm = (route.distance - comparisonRoute!.distance) / 1000;
        const timeDeltaMin = Math.round((route.adjustedDuration - comparisonRoute!.adjustedDuration) / 60);

        if (type === 'fastest') {
            // For fastest/AI route: show time comparison vs shortest
            const distanceNote = distanceDeltaKm > 0.1
                ? `+${distanceDeltaKm.toFixed(1)} km`
                : distanceDeltaKm < -0.1
                    ? `${Math.abs(distanceDeltaKm).toFixed(1)} km shorter`
                    : 'similar distance';
            // timeDeltaMin is negative if this route is faster, positive if slower
            if (timeDeltaMin < 0) {
                comparisonText = `Saves ~${Math.abs(timeDeltaMin)} min, ${distanceNote}`;
            } else if (timeDeltaMin > 0) {
                comparisonText = `+${timeDeltaMin} min longer, ${distanceNote}`;
            } else {
                comparisonText = `Similar time, ${distanceNote}`;
            }
        } else {
            // For shortest route: show it's the shortest distance
            const distanceNote = distanceDeltaKm < -0.1
                ? `${Math.abs(distanceDeltaKm).toFixed(1)} km shorter`
                : 'similar distance';
            const timeNote = timeDeltaMin > 0 
                ? `+${timeDeltaMin} min slower` 
                : timeDeltaMin < 0 
                    ? `${Math.abs(timeDeltaMin)} min faster` 
                    : '';
            comparisonText = timeNote ? `${distanceNote}, ${timeNote}` : distanceNote;
        }
    } else if (isSameRoute) {
        comparisonText = 'Matches other route';
    }

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`
                relative flex-1 min-w-[240px] p-4 rounded-xl border transition-all duration-200 text-left group
                ${isActive 
                    ? (isShortest ? 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500' : 'bg-green-50 border-green-500 shadow-md ring-1 ring-green-500') 
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }
            `}
        >
            {/* A* Badge */}
            {route.isCustomPath && (
                <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow">
                    A*
                </div>
            )}
            
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isShortest ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                        {isShortest ? <FiMapPin size={18} /> : <FiZap size={18} />}
                    </div>
                    <div>
                        <h4 className={`font-bold text-sm ${isShortest ? 'text-blue-900' : 'text-green-900'}`}>{title}</h4>
                        {comparisonText && (
                            <span className="text-[10px] font-medium text-gray-500 block -mt-0.5">{comparisonText}</span>
                        )}
                        {route.isCustomPath && (
                            <span className="text-[9px] font-medium text-purple-600 block">Avoids heavy traffic areas</span>
                        )}
                    </div>
                </div>
                {isActive && (
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isShortest ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                )}
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Duration</div>
                    <div className={`text-xl font-bold flex items-baseline gap-1 ${isShortest ? 'text-gray-800' : 'text-green-700'}`}>
                        {trafficMinutes} <span className="text-xs font-normal text-gray-500">min</span>
                    </div>
                </div>
                <div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Distance</div>
                    <div className="text-xl font-bold flex items-baseline gap-1 text-gray-800">
                        {distanceKm} <span className="text-xs font-normal text-gray-500">km</span>
                    </div>
                </div>
            </div>

            {/* Traffic Info */}
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <FiTrendingUp size={14} className={trafficClass} />
                    <span className="text-xs text-gray-600">Traffic: <span className={`font-semibold ${trafficClass}`}>{route.trafficScore.toFixed(1)}</span></span>
                </div>
                <div className="text-xs text-gray-400">
                    ~{noTrafficMinutes} min free-flow
                </div>
            </div>
        </button>
    );
}