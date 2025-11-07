# 📊 Giải thích luồng dữ liệu: WebSocket → Heatmap

## 🎯 Tổng quan Data Flow

```
Backend (Port 8085)
    ↓ WebSocket: ws://localhost:8085/ws
    ↓ Topic: /topic/traffic
    ↓
CameraMarkers Component
    ↓ 1. Nhận TrafficMetricsDTO qua WebSocket
    ↓ 2. Update trafficDataRef (Map<cameraId, totalCount>)
    ↓ 3. Update cameras._randCount
    ↓ 4. Gọi onCamerasUpdate(cameras)
    ↓
Map Component
    ↓ setCameras(cameras)
    ↓ Pass cameras xuống HeatLayerManager
    ↓
HeatLayerManager
    ↓ Convert cameras thành heat points
    ↓ [lat, lon, weight]
    ↓
Leaflet Heatmap Layer
    ✅ Hiển thị trên bản đồ
```

---

## 📝 Chi tiết từng bước

### **Bước 1: Backend WebSocket Server**

**File:** `backend/dashboard-service` (Port 8085)

Backend push data real-time qua WebSocket:

```java
// TrafficMetricsDTO được gửi qua /topic/traffic
{
  "id": 372,
  "cameraId": "TTH-29.4",
  "cameraName": "Trường Sơn - Ga Quốc Nội 2",
  "district": "Quận Tân Bình",
  "coordinates": [106.6649, 10.8129],
  "detectionDetails": {
    "car": 5,
    "motorcycle": 8,
    "truck": 1,
    "bus": 0
  },
  "totalCount": 14,
  "timestamp": "2025-11-07T08:30:15.000Z"
}
```

---

### **Bước 2: CameraMarkers - WebSocket Client**

**File:** `frontend/components/camera-markers/index.tsx`

#### **2.1. Khởi tạo WebSocket Connection**

```typescript
// Dòng 159-215: Setup WebSocket
const client = new Client({
  webSocketFactory: () => new SockJS(wsUrl),
  onConnect: () => {
    // Subscribe to topic
    client.subscribe(API_CONFIG.WS_TOPIC, (message) => {
      // Xử lý message...
    });
  }
});

client.activate();
```

**API Config:**
```typescript
// lib/api/config.ts
export const API_CONFIG = {
  WS_URL: 'http://localhost:8085/ws',
  WS_TOPIC: '/topic/traffic',
  DEFAULT_TIMEOUT: 10000,
  MAX_RECONNECT_ATTEMPTS: 10,
  RECONNECT_DELAY: 5000
};
```

#### **2.2. Nhận và xử lý WebSocket Messages**

```typescript
// Dòng 244-265: Subscribe handler
client.subscribe(API_CONFIG.WS_TOPIC, (message) => {
  // 1. Parse JSON message
  const trafficData: TrafficMetricsDTO = JSON.parse(message.body);
  
  // 2. Update traffic data map
  trafficDataRef.current.set(
    trafficData.cameraId,    // Key: "TTH-29.4"
    trafficData.totalCount   // Value: 14
  );
  
  // 3. Update ALL cameras với count mới
  camerasRef.current = camerasRef.current.map(c => {
    const cameraId = c.id || c._id || c.name;
    const count = trafficDataRef.current.get(cameraId) ?? 0;
    return { ...c, _randCount: count };  // ⭐ _randCount là traffic density
  });
  
  // 4. Notify parent component (Map)
  if (onCamerasUpdate) {
    onCamerasUpdate([...camerasRef.current]);
  }
});
```

**Giải thích:**
- `trafficDataRef`: **Map** lưu `cameraId → totalCount` (ví dụ: `"TTH-29.4" → 14`)
- `camerasRef.current`: **Array** chứa tất cả cameras với field `_randCount`
- Mỗi khi nhận message WebSocket:
  1. Lưu count vào Map
  2. Update tất cả cameras, match bằng ID
  3. Gọi callback `onCamerasUpdate()` để pass data lên parent

---

### **Bước 3: Fallback Mode - Random Data**

**Nếu WebSocket không kết nối được:**

```typescript
// Dòng 176-199: Random data fallback
const startRandomDataFallback = () => {
  randomDataIntervalRef.current = setInterval(() => {
    // Generate random traffic count 0-50
    camerasRef.current = camerasRef.current.map(c => ({
      ...c,
      _randCount: Math.floor(Math.random() * 51)
    }));
    
    // Notify parent
    if (onCamerasUpdate) {
      onCamerasUpdate([...camerasRef.current]);
    }
  }, 5000);  // Update mỗi 5 giây
};
```

**Khi nào kích hoạt:**
- WebSocket timeout sau 15 giây
- Max reconnect attempts đạt tới (10 lần)
- Connection error

---

### **Bước 4: Map Component - Camera Data Manager**

**File:** `frontend/components/map/index.tsx`

#### **4.1. Nhận cameras từ CameraMarkers**

```typescript
// Dòng 63: State để lưu cameras
const [cameras, setCameras] = useState<any[]>([]);

// Dòng 95-98: Pass callback xuống CameraMarkers
<CameraMarkers 
  onCameraClick={onCameraClick} 
  selectedCameraId={selectedCamera?._id}
  onCamerasUpdate={setCameras}  // ⭐ Nhận cameras update từ child
/>
```

**Data structure của `cameras`:**
```typescript
[
  {
    _id: "cam-001",
    id: "TTH-29.4",
    name: "Trường Sơn - Ga Quốc Nội 2",
    loc: {
      type: "Point",
      coordinates: [106.6649, 10.8129]  // [longitude, latitude]
    },
    dist: "Quận Tân Bình",
    _randCount: 14  // ⭐ Traffic density từ WebSocket
  },
  {
    _id: "cam-002",
    id: "Q1-01",
    name: "Nguyễn Huệ - Bến Nghé",
    loc: {
      coordinates: [106.7008, 10.7756]
    },
    _randCount: 25
  }
  // ... more cameras
]
```

#### **4.2. Pass cameras xuống HeatLayerManager**

```typescript
// Dòng 122-124: Render HeatLayerManager
{typeof window !== 'undefined' && (
  <HeatLayerManager 
    enabled={heatEnabled} 
    cameras={cameras}  // ⭐ Pass cameras với _randCount
  />
)}
```

---

### **Bước 5: HeatLayerManager - Tạo Heatmap Layer**

**File:** `frontend/components/map/index.tsx` (Dòng 129-242)

#### **5.1. Convert cameras → heat points**

```typescript
// Dòng 175-184: Build heat points
const points = cameras.map((c: any) => {
  const lat = c.loc.coordinates[1];   // Latitude
  const lon = c.loc.coordinates[0];   // Longitude
  
  // Normalize weight: 0-1 (chia cho 30 để spread evenly)
  const weight = c._randCount / 30;
  
  // Return format: [lat, lon, weight]
  return [lat, lon, weight];
});
```

**Ví dụ conversion:**
```javascript
// Input: Camera object
{
  name: "Trường Sơn - Ga Quốc Nội 2",
  loc: { coordinates: [106.6649, 10.8129] },
  _randCount: 14
}

// Output: Heat point
[10.8129, 106.6649, 0.467]  // [lat, lon, weight]
//                    ↑
//                    14 / 30 = 0.467
```

#### **5.2. Tạo Leaflet Heat Layer**

```typescript
// Dòng 185-195: Configure heat layer
const radius = 60;   // Bán kính hiệu ứng heat (pixels)
const blur = 0;      // Độ mờ (0 = sharp, 15 = very blurred)

// Color gradient: green → yellow → red
const gradient = {
  0.0: 'green',      // Weight 0.0 (không xe) → màu xanh
  0.25: '#7fff00',   // Weight 0.25 (ít xe) → xanh lá nhạt
  0.5: 'yellow',     // Weight 0.5 (trung bình) → vàng
  0.75: 'orange',    // Weight 0.75 (nhiều xe) → cam
  1.0: 'red'         // Weight 1.0 (rất đông) → đỏ
};

// Create heat layer
heat = L.heatLayer(points, { radius, blur, gradient });
heat.addTo(map);
```

#### **5.3. Update heat layer khi data thay đổi**

```typescript
// Dòng 197-208: Update existing layer
if (enabled) {
  if (!heat) {
    // Create new layer
    heat = L.heatLayer(points, { radius, blur, gradient });
    heat.addTo(map);
  } else {
    // Update existing layer với points mới
    heat.setLatLngs(points);  // ⭐ Không recreate, chỉ update data
  }
} else {
  // Remove layer khi disabled
  if (heat) {
    map.removeLayer(heat);
  }
}
```

---

## 🔄 Luồng Real-time Update

### **Ví dụ cụ thể:**

```
1️⃣ Backend gửi WebSocket message:
   {
     "cameraId": "TTH-29.4",
     "totalCount": 14,
     "timestamp": "2025-11-07T08:30:15Z"
   }

2️⃣ CameraMarkers nhận message:
   trafficDataRef.set("TTH-29.4", 14)

3️⃣ Update cameras array:
   cameras[5]._randCount = 14  // Camera với id "TTH-29.4"

4️⃣ Call onCamerasUpdate(cameras):
   Map component: setCameras(updatedCameras)

5️⃣ HeatLayerManager nhận cameras mới:
   useEffect triggers → recalculate heat points

6️⃣ Update heat layer:
   heat.setLatLngs([[10.8129, 106.6649, 0.467], ...])

7️⃣ Leaflet re-render heatmap:
   ✅ Màu sắc thay đổi theo traffic density
```

---

## 🎨 Heatmap Color Logic

```typescript
// Weight calculation
weight = totalCount / 30

// Color mapping:
totalCount =  0  → weight = 0.00  → GREEN  (không xe)
totalCount =  7  → weight = 0.23  → GREEN  (rất ít)
totalCount = 15  → weight = 0.50  → YELLOW (trung bình)
totalCount = 22  → weight = 0.73  → ORANGE (nhiều)
totalCount = 30+ → weight = 1.00  → RED    (rất đông)
```

**Visual example:**
```
🟢 Green (0-7 xe):        ████░░░░░░  Low traffic
🟡 Yellow (8-15 xe):      ██████░░░░  Medium traffic
🟠 Orange (16-22 xe):     ████████░░  High traffic
🔴 Red (23+ xe):          ██████████  Very high traffic
```

---

## 📊 Data Structure Summary

### **1. TrafficMetricsDTO (từ WebSocket)**
```typescript
interface TrafficMetricsDTO {
  id: number;
  cameraId: string;           // "TTH-29.4"
  cameraName: string;
  district: string;
  coordinates: [number, number];
  detectionDetails: {
    car?: number;
    motorcycle?: number;
    truck?: number;
    bus?: number;
  };
  totalCount: number;         // ⭐ Số lượng xe tổng cộng
  timestamp: string;
}
```

### **2. Camera (trong frontend)**
```typescript
interface Camera {
  _id: string;
  id: string;
  name: string;
  loc: {
    type: "Point";
    coordinates: [number, number];  // [lon, lat]
  };
  dist: string;
  ptz: boolean;
  angle: number;
  liveviewUrl: string;
  _randCount?: number;        // ⭐ Traffic density (từ WebSocket hoặc random)
}
```

### **3. Heat Point (cho Leaflet)**
```typescript
type HeatPoint = [
  number,  // Latitude
  number,  // Longitude
  number   // Weight (0-1)
];

// Example:
[10.8129, 106.6649, 0.467]
```

---

## 🔌 API Integration

### **REST API (Initial Load)**

```typescript
// Dòng 133-155 trong camera-markers/index.tsx
const fetchInitialData = async () => {
  // Gọi REST API để lấy 100 records mới nhất
  const data = await trafficApi.getLatest();
  
  // Update traffic data map
  data.forEach(traffic => {
    trafficDataRef.current.set(traffic.cameraId, traffic.totalCount);
  });
  
  // Update cameras với initial counts
  camerasRef.current = camerasRef.current.map(c => {
    const count = trafficDataRef.current.get(c.id) ?? 0;
    return { ...c, _randCount: count };
  });
};
```

**API Endpoint:**
```
GET http://localhost:8085/api/traffic/latest
```

**Response:**
```json
[
  {
    "id": 1,
    "cameraId": "TTH-29.4",
    "totalCount": 14,
    "timestamp": "2025-11-07T08:30:15Z"
  }
]
```

---

### **WebSocket (Real-time Updates)**

```typescript
// Subscribe to topic
client.subscribe('/topic/traffic', (message) => {
  const data = JSON.parse(message.body);  // TrafficMetricsDTO
  // Update logic...
});
```

**WebSocket URL:**
```
ws://localhost:8085/ws
```

**Topic:**
```
/topic/traffic
```

---

## 🛠️ Debug & Monitoring

### **Console Logs:**

```typescript
// 1. WebSocket connection status
console.log('✅ WebSocket connected, using real-time data');
console.log('⚠️ WebSocket unavailable, using random traffic data...');

// 2. Camera density updates
console.log('🚗 Camera Density Update:', cameras.map(c => ({
  id: c.id,
  name: c.name,
  density: c._randCount,
  coordinates: [c.loc.coordinates[1], c.loc.coordinates[0]]
})));

// 3. Map zoom changes
console.log('🗺️ Map zoom level:', map.getZoom());
```

### **DevTools Network Tab:**

**WebSocket frames:**
```
Frame sent:
SUBSCRIBE
id:sub-1
destination:/topic/traffic

Frame received:
MESSAGE
destination:/topic/traffic
content-type:application/json

{"cameraId":"TTH-29.4","totalCount":14,...}
```

---

## ⚡ Performance Optimization

### **1. Memoization:**
```typescript
// Camera icons được memoized để tránh recreate
const cameraIcon = useMemo(() => createCameraIcon(), []);
```

### **2. Ref instead of State:**
```typescript
// Use ref để tránh unnecessary re-renders
const trafficDataRef = useRef<Map<string, number>>(new Map());
const camerasRef = useRef<Camera[]>([]);
```

### **3. Heat Layer Update Strategy:**
```typescript
// Không recreate layer, chỉ update data points
if (heat) {
  heat.setLatLngs(points);  // Fast update
} else {
  heat = L.heatLayer(points);  // Create new
}
```

### **4. Clustering:**
```typescript
// Cluster cameras khi zoom out để reduce markers
const clusterDistance = getClusterDistance(zoom);
// zoom >= 14 → no cluster
// zoom >= 12 → 450m cluster
// zoom >= 10 → 900m cluster
// zoom < 10  → 1400m cluster
```

---

## 🎯 Key Takeaways

### **✅ Ưu điểm của kiến trúc này:**

1. **Real-time:** WebSocket push data ngay lập tức
2. **Fallback:** Tự động chuyển sang random data nếu WebSocket fail
3. **Efficient:** Không recreate heat layer, chỉ update data
4. **Scalable:** Support hàng trăm cameras với clustering
5. **Type-safe:** TypeScript interfaces đầy đủ

### **🔄 Data Flow Summary:**

```
Backend → WebSocket → CameraMarkers (trafficDataRef) 
    → Map (cameras state) 
    → HeatLayerManager (heat points) 
    → Leaflet Heat Layer 
    → 🎨 Visual Heatmap
```

### **📈 Update Frequency:**

- **WebSocket:** Real-time (mỗi khi có data mới từ backend)
- **REST API:** Initial load + fallback
- **Random data:** Mỗi 5 giây (khi WebSocket unavailable)
- **Heat layer:** Update mỗi khi cameras data thay đổi

---

🎉 **Heatmap hoạt động bằng cách lấy `_randCount` từ cameras, convert thành heat points với weight, rồi render bằng Leaflet Heat Layer!**
