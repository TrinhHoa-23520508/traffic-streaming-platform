# 🚗 Camera Info Card - Real-time Traffic Data Integration

## 📋 Tổng quan

Camera Info Card đã được tích hợp với **API thực** từ backend để hiển thị dữ liệu traffic real-time thay vì fake data.

---

## ✨ Tính năng mới

### **1. API Integration**

Sử dụng endpoint mới: `GET /api/traffic/camera/{cameraId}/latest`

**Method được thêm vào `trafficApi.ts`:**
```typescript
async getLatestForCamera(cameraId: string): Promise<TrafficMetricsDTO | null>
```

**Cách sử dụng:**
```typescript
const data = await trafficApi.getLatestForCamera('TTH-29.4');
// Returns: TrafficMetricsDTO hoặc null nếu không có data
```

---

### **2. Real-time Metrics Display**

#### **Số lượng xe (Vehicle Count)**
- **Source:** `trafficData.totalCount` từ API
- **Display:** `{count} xe`
- **Progress Bar:** 0-100 (capped tại 100)

#### **Lưu lượng xe (Flow Rate)**
- **Calculation:** Tính toán tự động dựa trên sự thay đổi vehicle count
- **Algorithm:**
  - Lưu lịch sử 60 mẫu (sliding window)
  - Tính delta giữa mẫu cũ nhất và mới nhất
  - Chuyển đổi sang xe/phút
  - Cập nhật mỗi 5 giây

**Code:**
```typescript
const countDiff = newCount - oldCount;
const timeDiff = (now - lastUpdate) / 1000; // seconds
const rate = (countDiff / timeDiff) * 60; // vehicles per minute
```

#### **Tình trạng kẹt xe (Congestion Status)**
- **Calculation:** Dựa trên `totalCount`
- **Logic:**
  ```typescript
  if (totalCount > 80)  → CAO (RED)
  if (totalCount > 40)  → TRUNG BÌNH (YELLOW)
  else                  → THẤP (GREEN)
  ```

---

### **3. Vehicle Detection Details**

Hiển thị chi tiết phân loại phương tiện từ YOLO AI:

```typescript
{
  "detectionDetails": {
    "car": 5,        // 🚗 Ô tô
    "motorcycle": 8, // 🏍️ Xe máy
    "truck": 1,      // 🚛 Xe tải
    "bus": 0         // 🚌 Xe buýt
  }
}
```

**Visual display:**
```
Chi tiết phương tiện
🚗 Ô tô: 5
🏍️ Xe máy: 8
🚛 Xe tải: 1
🚌 Xe buýt: 0

Cập nhật: 07/11/2025 14:30:15
```

---

## 🔄 Data Flow

```
User clicks camera marker
    ↓
CameraInfoCard component mounted
    ↓
useEffect: Fetch traffic data
    ↓
trafficApi.getLatestForCamera(cameraId)
    ↓
GET http://localhost:8085/api/traffic/camera/{cameraId}/latest
    ↓
Backend returns TrafficMetricsDTO
    ↓
Update states:
  - vehicleCount
  - congestionStatus
  - trafficData
    ↓
Flow rate calculation starts
  - countHistoryRef tracks changes
  - setInterval calculates rate every 5s
    ↓
Display metrics:
  - Vehicle count with progress bar
  - Flow rate (auto-calculated)
  - Congestion status badge
  - Detection details (if available)
```

---

## 📊 Component State Management

### **States:**

```typescript
// API data
const [trafficData, setTrafficData] = useState<TrafficMetricsDTO | null>(null);
const [loading, setLoading] = useState<boolean>(true);

// Calculated metrics
const [vehicleCount, setVehicleCount] = useState<number>(0);
const [flowRate, setFlowRate] = useState<number>(0);
const [congestionStatus, setCongestionStatus] = useState<'CAO' | 'TRUNG BÌNH' | 'THẤP'>('THẤP');

// Flow rate calculation refs
const countHistoryRef = useRef<number[]>([]);
const lastUpdateTimeRef = useRef<number>(Date.now());
const flowRateIntervalRef = useRef<NodeJS.Timeout | null>(null);
```

---

## ⏱️ Auto-refresh Strategy

### **1. Initial Load:**
```typescript
useEffect(() => {
  fetchTrafficData();
  // Auto-refresh every 30 seconds
  const interval = setInterval(fetchTrafficData, 30000);
  return () => clearInterval(interval);
}, [camera]);
```

### **2. Flow Rate Calculation:**
```typescript
useEffect(() => {
  // Update every 5 seconds
  const interval = setInterval(() => {
    calculateFlowRate();
  }, 5000);
  return () => clearInterval(interval);
}, [vehicleCount]);
```

### **3. Reset on Camera Change:**
```typescript
useEffect(() => {
  countHistoryRef.current = [];
  lastUpdateTimeRef.current = Date.now();
  setFlowRate(0);
}, [camera._id]);
```

---

## 🎨 UI Components

### **StatCardWithProgress:**
```tsx
<StatCardWithProgress
  label="Số lượng xe"
  value="14 xe"
  progressPercent={14}
  progressColorClass="bg-blue-500"
/>
```

### **StatCardWithBadge:**
```tsx
<StatCardWithBadge
  label="Tình trạng kẹt xe"
  badgeText="TRUNG BÌNH"
  badgeColorClass="bg-yellow-500 text-white"
/>
```

### **Detection Details Card:**
```tsx
<div className="bg-white rounded-lg p-3">
  <h4>Chi tiết phương tiện</h4>
  <div className="grid grid-cols-2 gap-2">
    <div>🚗 Ô tô: 5</div>
    <div>🏍️ Xe máy: 8</div>
    <div>🚛 Xe tải: 1</div>
    <div>🚌 Xe buýt: 0</div>
  </div>
  <p>Cập nhật: 07/11/2025 14:30:15</p>
</div>
```

---

## 🔧 API Configuration

### **Backend Endpoint:**
```
GET http://localhost:8085/api/traffic/camera/{cameraId}/latest
```

### **Request Example:**
```bash
curl http://localhost:8085/api/traffic/camera/TTH-29.4/latest
```

### **Response Example:**
```json
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
  "timestamp": "2025-11-07T14:30:15.000Z"
}
```

### **404 Response (No data):**
```
HTTP 404 Not Found
```
Component handles this gracefully by returning `null`.

---

## 🐛 Error Handling

### **1. API Error:**
```typescript
try {
  const data = await trafficApi.getLatestForCamera(cameraId);
} catch (error) {
  console.error('Error fetching traffic data:', error);
  // Component continues with default values
}
```

### **2. Camera Not Found:**
```typescript
if (response.status === 404) {
  return null; // No data available
}
```

### **3. Loading State:**
```tsx
if (loading && !trafficData) {
  return (
    <div className="flex items-center justify-center h-48">
      <LoadingSpinner />
    </div>
  );
}
```

---

## 📈 Metrics Calculation Details

### **Flow Rate Algorithm:**

**Step 1: Track count history**
```typescript
countHistoryRef.current.push(vehicleCount);
if (countHistoryRef.current.length > 60) {
  countHistoryRef.current.shift(); // Keep sliding window of 60
}
```

**Step 2: Calculate delta**
```typescript
const oldCount = history[0];      // Oldest count
const newCount = history[length-1]; // Newest count
const countDiff = Math.max(0, newCount - oldCount);
```

**Step 3: Convert to rate**
```typescript
const timeDiff = (Date.now() - lastUpdateTime) / 1000; // seconds
const rate = (countDiff / timeDiff) * 60; // vehicles per minute
```

**Update frequency:** Every 5 seconds

---

### **Congestion Status Logic:**

```typescript
const getCongestionStatus = (count: number) => {
  if (count > 80) return 'CAO';
  if (count > 40) return 'TRUNG BÌNH';
  return 'THẤP';
};
```

**Visual indicators:**
- 🔴 **CAO** (> 80 xe): Red badge, high traffic
- 🟡 **TRUNG BÌNH** (40-80 xe): Yellow badge, medium traffic
- 🟢 **THẤP** (< 40 xe): Green badge, low traffic

---

## 🎯 Integration with Map

### **Data passed from parent (page.tsx):**
```tsx
<CameraInfoCard 
  camera={selectedCamera}
  onClose={() => setSelectedCamera(null)}
  imageRefreshKey={imageRefreshKey}
  onImageClick={handleImageClick}
/>
```

### **Camera object structure:**
```typescript
{
  _id: "cam-001",
  id: "TTH-29.4",           // Used for API call
  name: "Trường Sơn - ...",
  dist: "Quận Tân Bình",
  loc: { coordinates: [106.6649, 10.8129] },
  liveviewUrl: "cam-bay-hien-2"
}
```

---

## ✅ Testing Checklist

### **1. Backend Running:**
```bash
cd backend
docker compose up -d
```

### **2. Verify API works:**
```bash
curl http://localhost:8085/api/traffic/camera/TTH-29.4/latest
```

### **3. Frontend Running:**
```bash
cd frontend
npm run dev
```

### **4. Test Flow:**
1. ✅ Click on camera marker
2. ✅ Camera info card appears
3. ✅ Loading spinner shows
4. ✅ Real traffic data loads from API
5. ✅ Vehicle count displays correctly
6. ✅ Flow rate calculates automatically
7. ✅ Congestion status shows correct color
8. ✅ Detection details appear (if available)
9. ✅ Data auto-refreshes every 30 seconds
10. ✅ Switching cameras resets flow rate calculation

---

## 🚀 Performance Optimizations

### **1. Memoization:**
- Component doesn't re-render unnecessarily
- Refs used for calculation data (no state re-renders)

### **2. Cleanup:**
```typescript
return () => {
  clearInterval(refreshInterval);
  clearInterval(flowRateIntervalRef.current);
};
```

### **3. Efficient Updates:**
- Only fetch when camera changes
- Auto-refresh at reasonable intervals (30s)
- Flow rate calculated client-side (no extra API calls)

---

## 📝 Files Changed

### **Modified:**
1. ✅ `frontend/lib/api/config.ts` - Added CAMERA_LATEST endpoint
2. ✅ `frontend/lib/api/trafficApi.ts` - Added getLatestForCamera() method
3. ✅ `frontend/components/camera-info-card/index.tsx` - Replaced fake data with real API

### **No changes needed:**
- `types/traffic.ts` - Already has TrafficMetricsDTO interface
- `types/camera.ts` - Camera interface unchanged

---

## 🎉 Summary

### **Before (Fake Data):**
```typescript
const fakeAnalytics = {
  vehicleCount: 68,
  flowRate: 39,
  congestionStatus: 'CAO'
};
```

### **After (Real API):**
```typescript
// Fetch real data
const data = await trafficApi.getLatestForCamera(cameraId);

// Use actual values
vehicleCount: data.totalCount,        // From backend
flowRate: calculated,                 // Auto-calculated
congestionStatus: calculated,         // Based on count
detectionDetails: data.detectionDetails // From YOLO AI
```

---

## 🔗 Related Documentation

- **Backend API:** `backend/README.md`
- **API Usage Guide:** `frontend/API_USAGE_GUIDE.md`
- **Data Flow:** `frontend/DATA_FLOW_EXPLANATION.md`
- **Dashboard Service:** `backend/dashboard-service/README.md`

---

🎊 **Camera Info Card now displays 100% real-time traffic data from backend!**
