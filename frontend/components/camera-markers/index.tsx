// component/camera-markers/index.tsx
"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Marker, useMap } from 'react-leaflet';
import { divIcon } from 'leaflet';
import type { Camera } from '@/types/camera';
import { trafficApi } from '@/lib/api/trafficApi';

interface CameraMarkersProps {
    onCameraClick?: (camera: Camera) => void;
    selectedCameraId?: string;
    onCamerasUpdate?: (cameras: any[]) => void;
    routingMode?: boolean;
    onRoutingCameraClick?: ((camera: any) => void) | null;
    heatEnabled?: boolean;
    routeCoordinates?: number[][] | null; // When set, only show cameras near this route
}

// Haversine formula to calculate distance between two points in meters
const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Custom camera icon using DivIcon for CSS styling
const createCameraIcon = (isSelected: boolean) => divIcon({
    className: `camera-marker ${isSelected ? 'selected' : ''}`,
    html: `
        <div class="camera-marker-content">
            <div class="camera-marker-pulse"></div>
            <!-- 
                TIP: To change the icon, replace the <svg>...</svg> block below.
                You can use any SVG icon (e.g. from Lucide, Heroicons, or your own drawing).
                Just make sure it has width/height or viewBox set correctly.
            -->
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
                <path d="M0 0 C4.88299938 3.19177379 9.61005627 6.56001406 14.29833984 10.02832031 C17.11340986 12.10272695 19.95167506 14.14436218 22.78930664 16.18774414 C25.08157215 17.83858115 27.37121597 19.49299361 29.66015625 21.1484375 C34.20568753 24.43545582 38.75305169 27.7199303 43.30078125 31.00390625 C44.80078984 32.08722769 46.30078983 33.17056104 47.80078125 34.25390625 C48.91453125 35.05828125 48.91453125 35.05828125 50.05078125 35.87890625 C152.42578125 109.81640625 152.42578125 109.81640625 254.80078125 183.75390625 C255.54400635 184.29063965 256.28723145 184.82737305 257.05297852 185.38037109 C258.54580897 186.4586075 260.03848597 187.5370564 261.53100586 188.61572266 C265.38943822 191.40384367 269.25085036 194.18769253 273.1171875 196.96484375 C276.89105155 199.67623828 280.65424498 202.40186028 284.41113281 205.13671875 C286.03899158 206.3144977 287.68037472 207.473543 289.32421875 208.62890625 C294.17106351 212.14247656 296.73057257 214.64179383 298.30078125 220.50390625 C298.85751662 225.79289226 298.27599336 229.08616706 295.30078125 233.50390625 C289.51153712 239.47819471 282.66273879 244.41547028 276.109375 249.515625 C272.1281238 252.62362276 268.21222768 255.80877972 264.30078125 259.00390625 C258.77761779 263.51178718 253.20893088 267.95233736 247.58984375 272.33984375 C243.11641417 275.84166872 238.70210923 279.41201789 234.30078125 283.00390625 C228.7773844 287.51150598 223.20893689 291.95233267 217.58984375 296.33984375 C213.11641417 299.84166872 208.70210923 303.41201789 204.30078125 307.00390625 C198.7773844 311.51150598 193.20893689 315.95233267 187.58984375 320.33984375 C183.11640487 323.84167599 178.70244706 327.41242123 174.30078125 331.00390625 C143.73604631 355.9048177 143.73604631 355.9048177 135.50024414 355.78466797 C128.81853101 354.93174643 123.13026798 350.10121571 117.98828125 346.06640625 C112.0533002 341.50797974 106.00518116 337.18774265 99.80078125 333.00390625 C93.16969645 328.52391153 86.72197878 323.87540296 80.359375 319.0234375 C75.28425095 315.17925805 70.07535726 311.5682666 64.80078125 308.00390625 C58.17016622 303.52318566 51.72201621 298.8754315 45.359375 294.0234375 C40.28425095 290.17925805 35.07535726 286.5682666 29.80078125 283.00390625 C23.17016622 278.52318566 16.72201621 273.8754315 10.359375 269.0234375 C5.28425095 265.17925805 0.07535726 261.5682666 -5.19921875 258.00390625 C-11.82983378 253.52318566 -18.27798379 248.8754315 -24.640625 244.0234375 C-29.71574905 240.17925805 -34.92464274 236.5682666 -40.19921875 233.00390625 C-46.82983378 228.52318566 -53.27798379 223.8754315 -59.640625 219.0234375 C-64.71574905 215.17925805 -69.92464274 211.5682666 -75.19921875 208.00390625 C-81.82538693 203.52619068 -88.27100517 198.88365701 -94.62744141 194.03222656 C-99.82534003 190.0925752 -105.17102283 186.40544133 -110.57421875 182.75390625 C-136.08443186 165.44848015 -136.08443186 165.44848015 -139.265625 153.98828125 C-140.65169974 146.04644762 -140.65049798 137.68492676 -136.69921875 130.50390625 C-133.74699421 126.32027254 -130.56976188 122.36549307 -127.29785156 118.42919922 C-125.12482596 115.81214364 -122.98396789 113.16951694 -120.84130859 110.52758789 C-119.74176661 109.17253236 -118.64051315 107.8188639 -117.53759766 106.46655273 C-114.04440973 102.1814309 -110.60178974 97.86123593 -107.19921875 93.50390625 C-100.59942917 85.05761816 -93.81107619 76.76638107 -87.03320312 68.46289062 C-80.91143151 60.95994374 -74.83007569 53.43296744 -68.86938477 45.80126953 C-64.22525874 39.86912089 -59.46335672 34.03436845 -54.703125 28.1953125 C-52.26805696 25.20747567 -49.85184462 22.20543592 -47.44921875 19.19140625 C-46.83046875 18.42699219 -46.21171875 17.66257812 -45.57421875 16.875 C-44.22382499 15.16731456 -42.91607295 13.42559754 -41.63671875 11.6640625 C-32.00992344 -1.1430134 -15.26774545 -8.25205828 0 0 Z M176.30078125 211.50390625 C172.09979632 216.15905171 170.94642035 219.03426584 171.015625 225.18359375 C171.55449633 229.56838237 174.0844238 232.19744824 176.98828125 235.31640625 C180.63330974 237.18817764 184.22416575 237.61734251 188.30078125 237.50390625 C193.67363992 235.6791618 196.7747916 232.55588554 199.30078125 227.50390625 C199.8750321 222.79693208 199.75632677 219.38245833 197.55078125 215.12890625 C193.49642347 210.39882218 190.75206187 208.93048502 184.546875 208.44140625 C181.13089337 208.53645965 179.08036996 209.56465831 176.30078125 211.50390625 Z " fill="currentColor" transform="translate(190.69921875,31.49609375)"/>
<path d="M0 0 C5.08080112 1.62705419 8.95251515 4.67748749 13.1875 7.8125 C14.8046083 8.99489999 16.42179808 10.17718856 18.0390625 11.359375 C19.2751123 12.26719727 19.2751123 12.26719727 20.53613281 13.19335938 C24.36525678 16.00108008 28.21300778 18.78280216 32.0625 21.5625 C32.80653076 22.10044189 33.55056152 22.63838379 34.31713867 23.19262695 C40.05020757 27.33141358 45.82174407 31.41349308 51.60571289 35.48071289 C57.52979108 39.65255074 63.40240075 43.89313377 69.26953125 48.14453125 C74.32082344 51.79995686 79.39958375 55.4134924 84.5 59 C92.71513017 64.77839028 100.86116115 70.64937294 108.99072266 76.54736328 C110.83621277 77.88158761 112.68779615 79.2066312 114.54296875 80.52734375 C115.53941406 81.24019531 116.53585938 81.95304687 117.5625 82.6875 C118.40941406 83.28949219 119.25632813 83.89148438 120.12890625 84.51171875 C122 86 122 86 123 88 C121.46993496 90.40395593 119.92676415 92.79760535 118.375 95.1875 C117.94832031 95.86103516 117.52164063 96.53457031 117.08203125 97.22851562 C113.83453787 102.1966958 110.42245939 106.2887703 105 109 C97.05327908 110.23335351 92.16256062 108.55840241 85.703125 103.921875 C82.57477263 101.69767071 79.35290922 99.86639774 76 98 C75.15179688 98.88300781 74.30359375 99.76601563 73.4296875 100.67578125 C65.45316774 108.8774123 57.2278655 116.24070158 48 123 C46.94167969 123.77988281 45.88335937 124.55976563 44.79296875 125.36328125 C20.27219486 142.8694811 -7.36184645 153.89107459 -37 159 C-37.67691895 159.11859375 -38.35383789 159.2371875 -39.05126953 159.359375 C-55.16117101 162.02387261 -71.73136359 161.18819387 -88 161 C-87.97905273 162.05912598 -87.95810547 163.11825195 -87.93652344 164.20947266 C-87.86386615 168.15659957 -87.81810746 172.10366792 -87.78027344 176.05126953 C-87.76021631 177.75644894 -87.73296343 179.46156006 -87.69824219 181.16650391 C-87.64946139 183.62419524 -87.62697281 186.08097366 -87.609375 188.5390625 C-87.58872986 189.29555084 -87.56808472 190.05203918 -87.54681396 190.83145142 C-87.54464237 196.00875795 -88.61287045 198.87557319 -92 203 C-97.22259857 207.05630398 -102.65340142 206.77397544 -109 206 C-113.60437409 203.8189807 -115.77111028 201.51993152 -118 197 C-118.38031673 193.82465458 -118.38031673 193.82465458 -118.38768005 190.17506409 C-118.39306559 189.50123922 -118.39845113 188.82741435 -118.40399987 188.13317055 C-118.41827199 185.88229408 -118.41117792 183.63200633 -118.40405273 181.38110352 C-118.40975672 179.76450122 -118.41672109 178.14790295 -118.42485046 176.53131104 C-118.44279402 172.14492243 -118.44161125 167.75873374 -118.43590808 163.37231946 C-118.43281793 159.70924563 -118.43890675 156.04621029 -118.44494683 152.38314193 C-118.4589944 143.7409911 -118.45742886 135.0989391 -118.44604492 126.45678711 C-118.43456337 117.54361645 -118.44863941 108.63074667 -118.4754414 99.71761566 C-118.49759862 92.06226119 -118.50423573 84.40700116 -118.49836498 76.7516169 C-118.49499426 72.18063174 -118.49741811 67.60983947 -118.51461601 63.0388813 C-118.53008345 58.74023888 -118.52613203 54.44204216 -118.50731087 50.14341736 C-118.5036244 48.56724063 -118.5067352 46.99103089 -118.51719666 45.41488457 C-118.53040541 43.26004996 -118.51886258 41.10669115 -118.50120544 38.95191956 C-118.50099616 37.74717767 -118.50078688 36.54243578 -118.50057125 35.30118656 C-117.75274825 30.36941465 -115.52948681 27.18792654 -111.62109375 24.15234375 C-106.87170897 22.06431319 -102.07751849 22.38079043 -97 23 C-92.4143008 25.17217331 -90.14131408 27.44525846 -88 32 C-87.6025121 34.94000341 -87.6500844 37.83867468 -87.70703125 40.80078125 C-87.71127609 41.63715622 -87.71552094 42.47353119 -87.71989441 43.33525085 C-87.73662636 45.99466765 -87.77426774 48.653314 -87.8125 51.3125 C-87.82755396 53.12043173 -87.84124112 54.92837539 -87.85351562 56.73632812 C-87.88651184 61.15784689 -87.93825572 65.57879302 -88 70 C-83.02315061 69.93001789 -78.04705557 69.84155721 -73.07080078 69.73754883 C-71.38566623 69.70474232 -69.70043342 69.67658039 -68.01513672 69.65356445 C-41.72969185 69.2852234 -19.59603571 63.1113529 1 46 C-1.52958281 43.36289578 -4.04767439 41.18135504 -7.0625 39.125 C-11.26875558 35.98401585 -13.45704916 33.25770502 -14.34375 27.9375 C-15.11595137 16.81780025 -6.40949753 8.25275173 0 0 Z " fill="currentColor" transform="translate(118,277)"/>
<path d="M0 0 C4.94712746 1.20335533 9.43893492 4.51817111 12.15234375 8.83203125 C13.16902408 11.4322966 13.33553858 13.52257752 13.375 16.3125 C13.40335938 17.21613281 13.43171875 18.11976563 13.4609375 19.05078125 C12.41262647 25.75819503 7.81807222 30.6635968 3.4375 35.5625 C-0.65529222 40.23693578 -4.62731505 44.96719058 -8.4375 49.875 C-13.96243069 56.98219252 -19.62972938 63.96687359 -25.32080078 70.94140625 C-28.15517592 74.41617379 -30.9841721 77.89530958 -33.8125 81.375 C-34.36147949 82.05030762 -34.91045898 82.72561523 -35.47607422 83.42138672 C-38.33142931 86.93653806 -41.17596203 90.45959181 -44 94 C-44.60585938 94.75539063 -45.21171875 95.51078125 -45.8359375 96.2890625 C-47.06231904 97.82535996 -48.28603244 99.36382136 -49.50097656 100.90917969 C-51.20123656 103.07069637 -52.91267964 105.22302982 -54.625 107.375 C-55.16382813 108.0659375 -55.70265625 108.756875 -56.2578125 109.46875 C-59.98599533 114.12897853 -63.57852739 118.16386801 -69.60546875 119.63671875 C-77.84186827 119.79870543 -82.58488878 116.80956519 -89 112 C-90.55627731 110.86319339 -92.1136612 109.72790083 -93.671875 108.59375 C-96.97579753 106.18017851 -100.2667669 103.75051314 -103.546875 101.3046875 C-107.33012754 98.48595291 -111.15055401 95.72754863 -115 93 C-110.94740626 88.78151061 -106.59210096 85.07128918 -102.0625 81.375 C-100.93533569 80.45086304 -100.93533569 80.45086304 -99.78540039 79.50805664 C-94.65270669 75.31321794 -89.46854083 71.18979164 -84.24047852 67.11474609 C-79.7802934 63.63278884 -75.38333673 60.07807358 -71 56.5 C-65.47666343 51.99232786 -59.90815403 47.55157233 -54.2890625 43.1640625 C-49.81563292 39.66223753 -45.40132798 36.09188836 -41 32.5 C-35.48468674 27.99899722 -29.9255786 23.56307631 -24.31323242 19.18383789 C-18.89420522 14.94390424 -13.56072485 10.60098315 -8.24023438 6.23828125 C-7.60021484 5.71492188 -6.96019531 5.1915625 -6.30078125 4.65234375 C-5.73528564 4.18820068 -5.16979004 3.72405762 -4.5871582 3.24584961 C-3.11373886 2.08928002 -1.55853877 1.03902584 0 0 Z " fill="currentColor" transform="translate(499,291)"/>
            </svg>
        </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -24]
});

export default function CameraMarkers({ onCameraClick, selectedCameraId, onCamerasUpdate, routingMode, onRoutingCameraClick, heatEnabled, routeCoordinates }: CameraMarkersProps) {
    const [visibleCameras, setVisibleCameras] = useState<Camera[]>([]);
    const [loading, setLoading] = useState(true);
    const map = useMap();
    const camerasRef = useRef<Camera[]>([]);
    const trafficDataRef = useRef<Map<string, number>>(new Map());

    const updateVisibleMarkersRef = useRef<NodeJS.Timeout | null>(null);
    
    // Helper function to check if a camera is near any point on the route
    const isCameraNearRoute = useCallback((camera: Camera, routeCoords: number[][]): boolean => {
        const PROXIMITY_THRESHOLD = 500; // 500 meters
        const cameraLat = camera.loc.coordinates[1];
        const cameraLng = camera.loc.coordinates[0];
        
        // Check distance to route points (sample every 5th point for performance)
        for (let i = 0; i < routeCoords.length; i += 5) {
            const [lng, lat] = routeCoords[i];
            const distance = getDistanceInMeters(cameraLat, cameraLng, lat, lng);
            if (distance <= PROXIMITY_THRESHOLD) {
                return true;
            }
        }
        return false;
    }, []);
    
    const updateVisibleMarkers = useCallback(() => {
        // Clear any pending updates
        if (updateVisibleMarkersRef.current) {
            clearTimeout(updateVisibleMarkersRef.current);
        }
        
        // Debounce to reduce excessive updates during pan/zoom - reduced to 50ms for snappier response
        updateVisibleMarkersRef.current = setTimeout(() => {
            if (!map) return;
            if (camerasRef.current.length === 0) {
                setVisibleCameras([]);
                return;
            }

            // Check if map is ready
            try {
                const bounds = map.getBounds();
                const inBounds = camerasRef.current.filter((camera) =>
                    bounds.contains([camera.loc.coordinates[1], camera.loc.coordinates[0]])
                );
                setVisibleCameras(inBounds);
            } catch (e) {
                // Map might not be ready yet
            }
        }, 50); // Reduced debounce for faster response
    }, [map]);

    // Load camera data once - use sessionStorage cache for instant reload
    useEffect(() => {
        const loadCameras = async () => {
            try {
                // Check sessionStorage cache first
                const cached = sessionStorage.getItem('cameras_markers_data');
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    // Use cache if less than 5 minutes old
                    if (Date.now() - timestamp < 5 * 60 * 1000) {
                        const withCounts = data.map((d: Camera) => ({ ...d, density: 0 }));
                        camerasRef.current = withCounts as any;
                        setLoading(false);
                        
                        const cameraIds = data.map((c: Camera) => c.id || (c as any)._id || c.name);
                        trafficApi.initializeCameraIds(cameraIds);
                        
                        if (onCamerasUpdate) onCamerasUpdate(withCounts);
                        updateVisibleMarkers();
                        return;
                    }
                }
                
                const response = await fetch('/camera_api.json');
                const data: Camera[] = await response.json();

                // Cache the data
                sessionStorage.setItem('cameras_markers_data', JSON.stringify({
                    data,
                    timestamp: Date.now()
                }));

                // Initialize with zero counts (will be updated from API)
                const withCounts = data.map(d => ({ ...d, density: 0 }));
                camerasRef.current = withCounts as any;
                setLoading(false);

                // Pre-populate trafficApi cache with camera IDs for random data generation
                const cameraIds = data.map(c => c.id || (c as any)._id || c.name);
                trafficApi.initializeCameraIds(cameraIds);

                // Notify parent component of camera data
                if (onCamerasUpdate) onCamerasUpdate(withCounts);
                updateVisibleMarkers();
            } catch (error) {
                console.error('Error loading cameras:', error);
                setLoading(false);
            }
        };

        loadCameras();
    }, [onCamerasUpdate, updateVisibleMarkers]);

    // Fetch initial traffic data and setup real-time updates
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const data = await trafficApi.getLatest();
                // Update traffic data map with initial data
                data.forEach(traffic => {
                    trafficDataRef.current.set(traffic.cameraId, traffic.totalCount);
                });

                // Update camera counts
                camerasRef.current = camerasRef.current.map(c => {
                    const cameraId = c.id || (c as any)._id || c.name;
                    const count = trafficDataRef.current.get(cameraId) ?? 0;
                    return { ...c, density: count };
                });

                // Notify parent component
                if (onCamerasUpdate) {
                    onCamerasUpdate([...camerasRef.current]);
                }
                updateVisibleMarkers();
            } catch (error) {
                console.error('⚠️ Error fetching initial traffic data:', error);
            }
        };

        // Wait for cameras to load first
        const timer = setTimeout(fetchInitialData, 1000);
        return () => clearTimeout(timer);
    }, [onCamerasUpdate, updateVisibleMarkers]);

    // Listen for camera selection from traffic alerts
    useEffect(() => {
        const handleSelectCamera = (event: CustomEvent) => {
            const { cameraId } = event.detail;
            console.log('📹 Selecting camera from alert:', cameraId);

            // Find camera by ID
            const camera = camerasRef.current.find(c =>
                (c.id === cameraId || (c as any)._id === cameraId || c.name === cameraId)
            );

            if (camera && onCameraClick) {
                onCameraClick(camera);
            } else {
                console.warn('Camera not found:', cameraId);
            }
        };

        window.addEventListener('selectCamera', handleSelectCamera as EventListener);

        return () => {
            window.removeEventListener('selectCamera', handleSelectCamera as EventListener);
        };
    }, [onCameraClick]);

    // Subscribe to real-time traffic updates
    useEffect(() => {
        let updateTimeout: NodeJS.Timeout | null = null;
        let pendingUpdate = false;
        
        const unsubscribe = trafficApi.subscribe((trafficData) => {

            // Check if cameraId exists, if not, log error
            if (!trafficData.cameraId) {
                console.error('❌ Invalid traffic data - missing cameraId:', trafficData);
                return; // Skip invalid data
            }

            // Update traffic data map
            trafficDataRef.current.set(trafficData.cameraId, trafficData.totalCount);

            // Update camera counts
            camerasRef.current = camerasRef.current.map(c => {
                const cameraId = c.id || (c as any)._id || c.name;
                const count = trafficDataRef.current.get(cameraId) ?? 0;
                return { ...c, density: count };
            });

            // Throttle updates to every 500ms to reduce re-renders
            if (!updateTimeout) {
                updateTimeout = setTimeout(() => {
                    // Notify parent component
                    if (onCamerasUpdate) {
                        onCamerasUpdate([...camerasRef.current]);
                    }

                    // Force re-render by updating visible cameras
                    if (map) {
                        const bounds = map.getBounds();
                        const inBounds = camerasRef.current.filter((camera) =>
                            bounds.contains([camera.loc.coordinates[1], camera.loc.coordinates[0]])
                        );
                        setVisibleCameras([...inBounds]);
                    }
                    
                    updateTimeout = null;
                    pendingUpdate = false;
                }, 500);
            } else {
                pendingUpdate = true;
            }
        });

        // Cleanup subscription on unmount
        return () => {
            if (updateTimeout) clearTimeout(updateTimeout);
            unsubscribe();
        };
    }, [map, onCamerasUpdate]);

    useEffect(() => {
        if (!map) return;

        const handleMapChange = () => {
            updateVisibleMarkers();
        };

        map.on('moveend', handleMapChange);
        map.on('zoomend', handleMapChange);

        handleMapChange();

        return () => {
            map.off('moveend', handleMapChange);
            map.off('zoomend', handleMapChange);
            if (updateVisibleMarkersRef.current) {
                clearTimeout(updateVisibleMarkersRef.current);
            }
        };
    }, [map, updateVisibleMarkers]);

    // Memoize camera icon to avoid recreation
    const defaultIcon = useMemo(() => createCameraIcon(false), []);
    const selectedIcon = useMemo(() => createCameraIcon(true), []);

    // Filter cameras based on route if routeCoordinates is provided
    const displayCameras = useMemo(() => {
        if (!routeCoordinates || routeCoordinates.length === 0) {
            return visibleCameras;
        }
        // Only show cameras that are near the route
        return visibleCameras.filter(camera => isCameraNearRoute(camera, routeCoordinates));
    }, [visibleCameras, routeCoordinates, isCameraNearRoute]);

    if (loading || heatEnabled) {
        return null;
    }

    return (
        <>
            {displayCameras.map((camera) => {
                // GeoJSON uses [longitude, latitude], Leaflet uses [latitude, longitude]
                const position: [number, number] = [
                    camera.loc.coordinates[1],
                    camera.loc.coordinates[0]
                ];

                const isSelected = camera._id === selectedCameraId;

                return (
                    <Marker
                        key={camera._id}
                        position={position}
                        icon={isSelected ? selectedIcon : defaultIcon}
                        zIndexOffset={isSelected ? 1000 : 0}
                        eventHandlers={{
                            click: (e) => {
                                // In routing mode with handler, use routing handler for route selection
                                // But still allow showing camera info
                                if (routingMode && onRoutingCameraClick) {
                                    onRoutingCameraClick(camera);
                                }
                                
                                // Always show camera info on click (even in routing mode)
                                // Bring marker to front on click
                                const marker = e.target;
                                if (marker && marker._icon) {
                                    marker._icon.style.zIndex = '1000';
                                }

                                if (onCameraClick) {
                                    onCameraClick(camera);
                                }
                            }
                        }}
                    />
                );
            })}
        </>
    );
}
