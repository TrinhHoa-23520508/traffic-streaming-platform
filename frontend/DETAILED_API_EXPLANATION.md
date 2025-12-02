# GIẢI THÍCH CHI TIẾT: trafficApi.ts, utils.ts và Camera-Markers

## 📋 MỤC LỤC
1. [trafficApi.ts - Service API chính](#1-trafficapits)
2. [utils.ts - Utilities](#2-utilsts)
3. [Camera-Markers - Cách subscribe và sử dụng](#3-camera-markers)
4. [Hướng dẫn áp dụng cho Camera-Info-Card](#4-hướng-dẫn-cho-camera-info-card)

---

## 1. trafficApi.ts

### 📌 **Mục đích**: 
File này là **singleton service** quản lý:
- ✅ Tất cả API calls đến backend
- ✅ WebSocket connection (STOMP over SockJS)
- ✅ Cache dữ liệu traffic
- ✅ Subscribe/Unsubscribe cho real-time updates
- ✅ Fallback mode khi backend offline

### 🔧 **CẤU TRÚC CHÍNH**

#### A. Class TrafficApiService
```typescript
class TrafficApiService {
  private stompClient: Client | null = null;           // WebSocket client
  private subscribers: Set<TrafficUpdateCallback>;     // Danh sách callbacks
  private trafficDataCache: Map<string, TrafficMetricsDTO>; // Cache dữ liệu
  private isConnected: boolean = false;                // Trạng thái kết nối
}
```

#### B. Các method quan trọng

##### **1. initWebSocket()** - Khởi tạo kết nối WebSocket
```typescript
private initWebSocket() {
  // Tạo STOMP client với SockJS
  const client = new Client({
    webSocketFactory: () => new SockJS(wsUrl),
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
    
    // Khi kết nối thành công
    onConnect: () => {
      this.isConnected = true;
      
      // SUBSCRIBE vào topic /topic/traffic
      client.subscribe('/topic/traffic', (message) => {
        // Parse data từ backend
        const backendData = JSON.parse(message.body);
        const trafficData = transformTrafficData(backendData);
        
        // Lưu vào cache
        this.trafficDataCache.set(trafficData.cameraId, trafficData);
        
        // NOTIFY tất cả subscribers
        this.subscribers.forEach(callback => callback(trafficData));
      });
    }
  });
  
  client.activate();
}
```

**🔑 ĐIỂM QUAN TRỌNG:**
- WebSocket tự động subscribe vào topic `/topic/traffic`
- Mỗi khi backend push data mới → gọi tất cả callbacks trong `subscribers`
- Data được cache lại trong `trafficDataCache`

##### **2. subscribe(callback)** - Đăng ký nhận real-time updates
```typescript
subscribe(callback: TrafficUpdateCallback): () => void {
  // Thêm callback vào Set
  this.subscribers.add(callback);
  
  // Nếu đây là subscriber đầu tiên → khởi tạo WebSocket
  if (this.subscribers.size === 1 && !this.isConnected) {
    this.initWebSocket();
  }
  
  // RETURN unsubscribe function
  return () => {
    this.subscribers.delete(callback);
    
    // Nếu không còn subscriber nào → cleanup connection
    if (this.subscribers.size === 0) {
      this.cleanup();
    }
  };
}
```

**🔑 PATTERN QUAN TRỌNG:**
```typescript
// Cách sử dụng trong component
useEffect(() => {
  const unsubscribe = trafficApi.subscribe((data) => {
    // XỬ LÝ data mới ở đây
    console.log('Received:', data);
  });
  
  // Cleanup khi component unmount
  return () => unsubscribe();
}, []);
```

##### **3. REST API Methods** - Fetch dữ liệu lịch sử

```typescript
// Lấy 100 records mới nhất
async getLatest(params?: { district?: string }): Promise<TrafficMetricsDTO[]>

// Lấy summary theo quận
async getSummaryByDistrict(params?: { date?: string }): Promise<Record<string, number>>

// Lấy data theo ngày
async getByDate(params?: { date?: string, cameraId?: string }): Promise<TrafficMetricsDTO[]>

// Lấy summary theo giờ
async getHourlySummary(params?: { date?: string, district?: string }): Promise<Record<number, number>>

// Lấy data mới nhất của 1 camera
async getCameraLatest(cameraId: string): Promise<TrafficMetricsDTO>
```

**🔑 USAGE:**
```typescript
// Trong component
const fetchData = async () => {
  try {
    // Lấy initial data
    const latest = await trafficApi.getLatest();
    
    // Hoặc lấy data của 1 camera cụ thể
    const cameraData = await trafficApi.getCameraLatest('CAM001');
  } catch (error) {
    console.error('Error:', error);
  }
};
```

##### **4. Cache Management**

```typescript
// Lấy cached data của 1 camera
getCachedData(cameraId: string): TrafficMetricsDTO | undefined

// Lấy tất cả cached data
getAllCachedData(): TrafficMetricsDTO[]

// Pre-populate cache với camera IDs (cho fallback mode)
initializeCameraIds(cameraIds: string[]): void
```

---

## 2. utils.ts

### 📌 **Mục đích**:
File utility nhỏ cho Tailwind CSS class merging.

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Merge Tailwind classes an toàn
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**🔑 USAGE:**
```typescript
// Trong component
<div className={cn(
  "base-class",
  isActive && "active-class",
  error && "error-class"
)}>
  Content
</div>
```

**❗ KHÔNG liên quan trực tiếp đến traffic API**, chỉ dùng cho styling.

---

## 3. Camera-Markers - Cách Subscribe và Sử Dụng

### 📌 **FLOW HOẠT ĐỘNG**

```
1. Component mount
   ↓
2. Load cameras từ camera_api.json
   ↓
3. Pre-populate trafficApi cache với camera IDs
   ↓
4. Fetch initial traffic data (getLatest())
   ↓
5. Subscribe vào real-time updates
   ↓
6. Nhận WebSocket data liên tục
   ↓
7. Update camera density
   ↓
8. Notify parent component
   ↓
9. Re-render markers
```

### 🔧 **CODE CHI TIẾT**

#### BƯỚC 1: Load Cameras (useEffect #1)
```typescript
useEffect(() => {
  const loadCameras = async () => {
    // Fetch camera list từ JSON
    const response = await fetch('/camera_api.json');
    const data: Camera[] = await response.json();
    
    // Initialize với density = 0
    const withCounts = data.map(d => ({ ...d, density: 0 }));
    camerasRef.current = withCounts;
    
    // ⭐ PRE-POPULATE trafficApi cache
    const cameraIds = data.map(c => c.id || c._id || c.name);
    trafficApi.initializeCameraIds(cameraIds);
    
    // Notify parent
    if (onCamerasUpdate) onCamerasUpdate(withCounts);
  };
  
  loadCameras();
}, []);
```

**🔑 TẠI SAO CẦN initializeCameraIds?**
- Để fallback mode biết cameras nào cần generate random data
- Cache sẽ có entry cho mỗi camera (ban đầu = 0)

#### BƯỚC 2: Fetch Initial Data (useEffect #2)
```typescript
useEffect(() => {
  const fetchInitialData = async () => {
    // ⭐ GỌI API lấy 100 records mới nhất
    const data = await trafficApi.getLatest();
    
    // Update traffic data map
    data.forEach(traffic => {
      trafficDataRef.current.set(traffic.cameraId, traffic.totalCount);
    });
    
    // ⭐ UPDATE camera density
    camerasRef.current = camerasRef.current.map(c => {
      const cameraId = c.id || c._id || c.name;
      const count = trafficDataRef.current.get(cameraId) ?? 0;
      return { ...c, density: count };
    });
    
    // Notify parent
    if (onCamerasUpdate) onCamerasUpdate([...camerasRef.current]);
  };
  
  const timer = setTimeout(fetchInitialData, 1000);
  return () => clearTimeout(timer);
}, []);
```

**🔑 LƯU Ý:**
- Fetch initial data SAU KHI cameras loaded (setTimeout 1s)
- Map traffic count vào camera.density
- Spread array khi notify để trigger re-render

#### BƯỚC 3: Subscribe Real-time Updates (useEffect #3) ⭐⭐⭐
```typescript
useEffect(() => {
  // ⭐⭐⭐ SUBSCRIBE vào trafficApi
  const unsubscribe = trafficApi.subscribe((trafficData) => {
    
    // Validate data
    if (!trafficData.cameraId) {
      console.error('Invalid traffic data:', trafficData);
      return;
    }
    
    // ⭐ UPDATE traffic data map
    trafficDataRef.current.set(trafficData.cameraId, trafficData.totalCount);
    
    // ⭐ UPDATE camera density
    camerasRef.current = camerasRef.current.map(c => {
      const cameraId = c.id || c._id || c.name;
      const count = trafficDataRef.current.get(cameraId) ?? 0;
      return { ...c, density: count };
    });
    
    // ⭐ NOTIFY parent component
    if (onCamerasUpdate) {
      onCamerasUpdate([...camerasRef.current]);
    }
    
    // ⭐ FORCE re-render visible cameras
    if (map) {
      const bounds = map.getBounds();
      const inBounds = camerasRef.current.filter((camera) =>
        bounds.contains([camera.loc.coordinates[1], camera.loc.coordinates[0]])
      );
      setVisibleCameras([...inBounds]); // Spread to trigger re-render
    }
  });
  
  // ⭐ CLEANUP khi unmount
  return () => {
    unsubscribe();
  };
}, [map, onCamerasUpdate]);
```

**🔑 QUAN TRỌNG NHẤT:**
1. **Subscribe pattern:**
   ```typescript
   const unsubscribe = trafficApi.subscribe(callback);
   return () => unsubscribe(); // Cleanup
   ```

2. **Callback nhận TrafficMetricsDTO:**
   ```typescript
   (trafficData) => {
     // trafficData.cameraId
     // trafficData.totalCount
     // trafficData.detectionDetails
     // trafficData.timestamp
   }
   ```

3. **Update flow:**
   ```
   WebSocket data → Update map → Update cameras → Notify parent → Re-render
   ```

---

## 4. HƯỚNG DẪN CHO CAMERA-INFO-CARD

### 🎯 **MỤC TIÊU**
Thay fake data bằng real-time data từ:
- ✅ API: `/api/traffic/camera/{cameraId}/latest` (initial load)
- ✅ WebSocket: Subscribe để nhận updates liên tục

### 📝 **IMPLEMENTATION STEPS**

#### STEP 1: Import trafficApi
```typescript
import { trafficApi } from '@/lib/api/trafficApi';
import type { TrafficMetricsDTO } from '@/types/traffic';
```

#### STEP 2: Add State
```typescript
export default function CameraInfoCard({ camera, ... }: CameraInfoCardProps) {
  // ⭐ State để lưu traffic data
  const [trafficData, setTrafficData] = useState<TrafficMetricsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  
  // ⭐ History cho flow rate calculation (2 phút)
  const [countHistory, setCountHistory] = useState<Array<{count: number, timestamp: number}>>([]);
  
  // ⭐ Last update time
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
```

#### STEP 3: Fetch Initial Data
```typescript
useEffect(() => {
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // ⭐ Lấy camera ID
      const cameraId = camera.id || camera._id || camera.name;
      
      // ⭐ GỌI API lấy latest data
      const data = await trafficApi.getCameraLatest(cameraId);
      
      setTrafficData(data);
      setLastUpdateTime(new Date());
      
      // Initialize history
      setCountHistory([{
        count: data.totalCount,
        timestamp: Date.now()
      }]);
      
    } catch (error) {
      console.error('Error fetching camera data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  fetchInitialData();
}, [camera]);
```

#### STEP 4: Subscribe Real-time Updates ⭐⭐⭐
```typescript
useEffect(() => {
  const cameraId = camera.id || camera._id || camera.name;
  
  // ⭐ SUBSCRIBE vào trafficApi
  const unsubscribe = trafficApi.subscribe((data) => {
    // ⭐ CHỈ update nếu data là của camera này
    if (data.cameraId === cameraId) {
      console.log('📨 Camera data updated:', data);
      
      setTrafficData(data);
      setLastUpdateTime(new Date());
      
      // ⭐ Update history cho flow rate
      setCountHistory(prev => {
        const now = Date.now();
        const twoMinutesAgo = now - 2 * 60 * 1000;
        
        // Filter data trong 2 phút + add new data
        const filtered = prev.filter(item => item.timestamp > twoMinutesAgo);
        return [...filtered, { count: data.totalCount, timestamp: now }];
      });
    }
  });
  
  // ⭐ CLEANUP
  return () => {
    unsubscribe();
  };
}, [camera]);
```

**🔑 QUAN TRỌNG:**
- Filter data theo `cameraId` vì WebSocket push tất cả cameras
- Update history để tính flow rate chính xác
- Cleanup khi camera thay đổi hoặc unmount

#### STEP 5: Calculate Flow Rate
```typescript
// ⭐ Tính flow rate từ history
const calculateFlowRate = (): number => {
  if (countHistory.length < 2) return 0;
  
  const latest = countHistory[countHistory.length - 1];
  const oldest = countHistory[0];
  
  const countDiff = latest.count - oldest.count;
  const timeDiff = (latest.timestamp - oldest.timestamp) / 1000 / 60; // phút
  
  if (timeDiff === 0) return 0;
  
  return Math.round(countDiff / timeDiff);
};

const flowRate = calculateFlowRate();
```

#### STEP 6: Calculate Congestion Status
```typescript
// ⭐ Tính congestion dựa trên totalCount
const getCongestionStatus = (): 'CAO' | 'TRUNG BÌNH' | 'THẤP' => {
  if (!trafficData) return 'THẤP';
  
  const count = trafficData.totalCount;
  if (count > 50) return 'CAO';
  if (count > 20) return 'TRUNG BÌNH';
  return 'THẤP';
};

const congestionStatus = getCongestionStatus();
```

#### STEP 7: Render Real Data
```typescript
return (
  <div className="bg-gray-50 p-3 rounded-lg shadow-lg space-y-3">
    {/* Image section - giữ nguyên */}
    
    {loading ? (
      <div>Loading...</div>
    ) : trafficData ? (
      <>
        <StatCardWithProgress
          label="Số lượng xe"
          value={`${trafficData.totalCount} xe`}
          progressPercent={Math.min(trafficData.totalCount, 100)}
          progressColorClass="bg-blue-500"
        />
        
        <StatCardWithProgress
          label="Lưu lượng xe"
          value={`${flowRate} xe/phút`}
          progressPercent={Math.min(flowRate * 1.5, 100)}
          progressColorClass="bg-purple-500"
        />
        
        <StatCardWithBadge
          label="Tình trạng kẹt xe"
          badgeText={congestionStatus}
          badgeColorClass={getCongestionColor(congestionStatus)}
        />
        
        {/* ⭐ Hiện timestamps */}
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
          {trafficData.timestamp && (
            <p className="text-xs text-gray-500">
              <span className="font-medium">Dữ liệu từ:</span>{' '}
              {new Date(trafficData.timestamp).toLocaleString('vi-VN')}
            </p>
          )}
          {lastUpdateTime && (
            <p className="text-xs text-green-600">
              <span className="font-medium">🔄 Cập nhật lúc:</span>{' '}
              {lastUpdateTime.toLocaleTimeString('vi-VN')}
            </p>
          )}
        </div>
      </>
    ) : (
      <div>Không có dữ liệu</div>
    )}
  </div>
);
```

---

## 🔄 LUỒNG DỮ LIỆU HOÀN CHỈNH

```
BACKEND                          trafficApi.ts                    CAMERA-INFO-CARD
   │                                  │                                  │
   │ WebSocket push data              │                                  │
   │ ──────────────────────────────> │                                  │
   │ /topic/traffic                   │                                  │
   │                                  │ Store in cache                   │
   │                                  │ trafficDataCache.set()           │
   │                                  │                                  │
   │                                  │ Notify subscribers               │
   │                                  │ subscribers.forEach(callback)    │
   │                                  │ ───────────────────────────────> │
   │                                  │                                  │ Filter by cameraId
   │                                  │                                  │ setTrafficData()
   │                                  │                                  │ Update history
   │                                  │                                  │ Calculate metrics
   │                                  │                                  │ Re-render UI
   │                                  │                                  │
```

---

## 📊 SO SÁNH CAMERA-MARKERS vs CAMERA-INFO-CARD

| Aspect | Camera-Markers | Camera-Info-Card |
|--------|----------------|------------------|
| **Subscribe?** | ✅ Có (tất cả cameras) | ✅ Có (filter 1 camera) |
| **Filter data?** | ❌ Không (dùng tất cả) | ✅ Có (theo cameraId) |
| **Initial fetch** | `getLatest()` | `getCameraLatest(cameraId)` |
| **Update đối tượng** | Update camera.density | Update trafficData state |
| **History tracking** | ❌ Không | ✅ Có (cho flow rate) |
| **Notify parent** | ✅ onCamerasUpdate | ❌ Không cần |
| **Re-render trigger** | Set visibleCameras | setState triggers auto |

---

## ✅ CHECKLIST KHI IMPLEMENT

- [ ] Import `trafficApi` và `TrafficMetricsDTO`
- [ ] Add state: `trafficData`, `loading`, `countHistory`, `lastUpdateTime`
- [ ] useEffect #1: Fetch initial data với `getCameraLatest(cameraId)`
- [ ] useEffect #2: Subscribe với filter theo `cameraId`
- [ ] Implement `calculateFlowRate()` từ history
- [ ] Implement `getCongestionStatus()` từ totalCount
- [ ] Cleanup subscription khi unmount
- [ ] Render real data thay vì fake data
- [ ] Hiện timestamps (backend time + frontend update time)

---

## 🚀 TEST & DEBUG

```typescript
// Trong subscribe callback, add logging:
const unsubscribe = trafficApi.subscribe((data) => {
  console.log('📨 Received data:', {
    cameraId: data.cameraId,
    totalCount: data.totalCount,
    timestamp: data.timestamp,
    myCamera: camera.id || camera._id || camera.name
  });
  
  if (data.cameraId === myCameraId) {
    console.log('✅ Matched my camera!');
  } else {
    console.log('⏭️ Different camera, skipping');
  }
});
```

---

## 💡 TIPS & BEST PRACTICES

1. **Always cleanup subscriptions:**
   ```typescript
   return () => unsubscribe();
   ```

2. **Filter data by cameraId:**
   ```typescript
   if (data.cameraId === currentCameraId) { ... }
   ```

3. **Use history for time-based calculations:**
   - Flow rate cần ít nhất 2 data points
   - Keep sliding window (2 minutes)

4. **Handle loading & error states:**
   ```typescript
   if (loading) return <Loading />;
   if (!trafficData) return <NoData />;
   ```

5. **Log extensively during development:**
   - Log subscription events
   - Log data filtering
   - Log calculations

---

## 🎓 SUMMARY

### trafficApi.ts là gì?
- **Singleton service** quản lý WebSocket + REST API
- **Subscribe pattern** cho real-time updates
- **Cache** để tối ưu performance

### Cách subscribe?
```typescript
const unsubscribe = trafficApi.subscribe((data) => {
  // Handle data
});
return () => unsubscribe(); // Cleanup
```

### Cách fetch initial data?
```typescript
const data = await trafficApi.getCameraLatest(cameraId);
```

### Camera-Markers làm gì?
- Subscribe nhận TẤT CẢ camera data
- Update `camera.density` cho heatmap
- Notify parent component

### Camera-Info-Card cần làm gì?
- Subscribe và **filter** theo 1 cameraId
- Track history cho flow rate
- Display real-time metrics
- Show timestamps

---

**🎯 BẠN ĐÃ SẴN SÀNG IMPLEMENT!** 🚀
