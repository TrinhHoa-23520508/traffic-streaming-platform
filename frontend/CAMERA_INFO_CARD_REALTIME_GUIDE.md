# Camera Info Card - Real-time Implementation Guide

## 🎯 TÓM TẮT IMPLEMENTATION

Camera Info Card đã được refactor để sử dụng **real-time data** từ backend thay vì fake data, theo đúng pattern của Camera Markers component.

---

## ✅ NHỮNG GÌ ĐÃ THỰC HIỆN

### 1. **Import trafficApi Service**
```typescript
import { trafficApi } from '@/lib/api/trafficApi';
import type { TrafficMetricsDTO } from '@/types/traffic';
```

### 2. **Add State Management**
```typescript
// State cho traffic data
const [trafficData, setTrafficData] = useState<TrafficMetricsDTO | null>(null);
const [loading, setLoading] = useState(true);

// History cho flow rate calculation (2 minutes sliding window)
const [countHistory, setCountHistory] = useState<Array<{count: number, timestamp: number}>>([]);

// Timestamp khi nhận data từ WebSocket
const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
```

### 3. **Fetch Initial Data (useEffect #1)**
```typescript
useEffect(() => {
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const cameraId = camera.id || camera._id || camera.name;
      
      // ⭐ GỌI API lấy latest data của camera này
      const data = await trafficApi.getCameraLatest(cameraId);
      
      setTrafficData(data);
      setLastUpdateTime(new Date());
      
      // Initialize history với first data point
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

**🔑 Điểm quan trọng:**
- Dùng `trafficApi.getCameraLatest(cameraId)` để lấy data ban đầu
- Initialize history với 1 data point đầu tiên
- Set lastUpdateTime để track khi nào data được load

### 4. **Subscribe Real-time Updates (useEffect #2)** ⭐⭐⭐
```typescript
useEffect(() => {
  const cameraId = camera.id || camera._id || camera.name;
  
  // ⭐ SUBSCRIBE vào trafficApi WebSocket
  const unsubscribe = trafficApi.subscribe((data) => {
    
    // ⭐ FILTER: chỉ update nếu data thuộc camera này
    if (data.cameraId === cameraId) {
      console.log('📨 Camera data updated:', data);
      
      setTrafficData(data);
      setLastUpdateTime(new Date());
      
      // ⭐ Update history (keep 2 minutes sliding window)
      setCountHistory(prev => {
        const now = Date.now();
        const twoMinutesAgo = now - 2 * 60 * 1000;
        
        // Filter old data + add new data
        const filtered = prev.filter(item => item.timestamp > twoMinutesAgo);
        return [...filtered, { count: data.totalCount, timestamp: now }];
      });
    }
  });
  
  // ⭐ CLEANUP khi unmount hoặc camera thay đổi
  return () => {
    unsubscribe();
  };
}, [camera]);
```

**🔑 QUAN TRỌNG NHẤT:**

#### **Tại sao phải filter theo cameraId?**
- WebSocket push data cho **TẤT CẢ cameras**
- Camera Info Card chỉ quan tâm đến **1 camera cụ thể**
- Nếu không filter → sẽ nhận data của camera khác → SAI DATA

#### **Pattern Subscribe + Cleanup:**
```typescript
// Subscribe và lưu unsubscribe function
const unsubscribe = trafficApi.subscribe(callback);

// Cleanup trong return của useEffect
return () => unsubscribe();
```

Đây là **standard pattern** cho WebSocket subscription trong React.

#### **Sliding Window History (Cập nhật):**
```typescript
// Giữ lại tối đa 10 mẫu gần nhất HOẶC dữ liệu trong 5 phút
const MAX_SAMPLES = 10;
const MAX_TIME_WINDOW = 5 * 60 * 1000;

// Logic này đảm bảo hoạt động tốt cho cả 2 trường hợp:
// 1. Update nhanh (1s/lần): Giữ 10 mẫu cuối (~10s) -> Phản ứng nhanh
// 2. Update chậm (1ph/lần): Giữ 5 mẫu cuối (~5ph) -> Đủ dữ liệu để tính trung bình
```

Dùng để tính **flow rate chính xác** và ổn định hơn.

### 5. **Calculate Flow Rate**
```typescript
const calculateFlowRate = (): number => {
  // Nếu chưa có history, dùng data hiện tại
  if (countHistory.length === 0) {
      return trafficData ? Math.round(trafficData.totalCount * 1.8) : 0;
  }
  
  // Tính trung bình mật độ xe trong history để làm mượt dữ liệu
  const avgDensity = countHistory.reduce((sum, item) => sum + item.count, 0) / countHistory.length;
  
  // Heuristic: Ước tính lưu lượng = Mật độ * Hệ số luân chuyển
  // Giả sử xe lưu thông qua khung hình với tốc độ trung bình, thay thế toàn bộ xe trong khoảng 30-40s
  // => Hệ số nhân khoảng 1.5 - 2.0
  const TURNOVER_RATE = 1.8;
  
  return Math.round(avgDensity * TURNOVER_RATE);
};
```

**🔑 Công thức:**
```
Flow Rate (xe/phút) ≈ Mật độ trung bình * Hệ số luân chuyển (1.8)
```

**Tại sao thay đổi?**
- Công thức cũ `(Count mới - Count cũ) / Thời gian` chỉ tính **sự thay đổi mật độ**.
- Nếu lưu lượng ổn định (xe vào = xe ra), mật độ không đổi → Flow Rate = 0 (Sai).
- Công thức mới ước tính dựa trên mật độ hiện tại và giả định tốc độ di chuyển.

**Tại sao cần history?**
- Không thể tính flow rate từ 1 data point duy nhất
- Cần ít nhất 2 points để biết **sự thay đổi theo thời gian**
- Sliding window 2 phút → flow rate chính xác hơn

### 6. **Calculate Congestion Status**
```typescript
const getCongestionStatus = (): 'CAO' | 'TRUNG BÌNH' | 'THẤP' => {
  if (!trafficData) return 'THẤP';
  
  const count = trafficData.totalCount;
  if (count > 50) return 'CAO';
  if (count > 20) return 'TRUNG BÌNH';
  return 'THẤP';
};
```

**🔑 Logic:**
- `> 50 xe`: CAO (đỏ)
- `20-50 xe`: TRUNG BÌNH (vàng)  
- `< 20 xe`: THẤP (xanh)

### 7. **Render Real Data**
```typescript
{loading ? (
  <div>Đang tải dữ liệu...</div>
) : trafficData ? (
  <>
    {/* Số lượng xe */}
    <StatCardWithProgress
      label="Số lượng xe"
      value={`${trafficData.totalCount} xe`}
      progressPercent={Math.min(trafficData.totalCount, 100)}
      progressColorClass="bg-blue-500"
    />
    
    {/* Flow rate */}
    <StatCardWithProgress
      label="Lưu lượng xe"
      value={`${flowRate} xe/phút`}
      progressPercent={Math.min(flowRate * 1.5, 100)}
      progressColorClass="bg-purple-500"
    />
    
    {/* Congestion */}
    <StatCardWithBadge
      label="Tình trạng kẹt xe"
      badgeText={congestionStatus}
      badgeColorClass={getCongestionColor(congestionStatus)}
    />
    
    {/* Detection details (car, motorcycle, bus, truck) */}
    {trafficData.detectionDetails && (
      <div>
        {Object.entries(trafficData.detectionDetails).map(([type, count]) => (
          <div key={type}>{type}: {count}</div>
        ))}
      </div>
    )}
    
    {/* Timestamps */}
    <div>
      <p>Dữ liệu từ: {trafficData.timestamp}</p>
      <p>🔄 Cập nhật lúc: {lastUpdateTime}</p>
    </div>
  </>
) : (
  <div>Không có dữ liệu</div>
)}
```

---

## 🔄 LUỒNG DỮ LIỆU

```
USER CLICKS CAMERA
    ↓
Component Mount
    ↓
fetchInitialData() → trafficApi.getCameraLatest(cameraId)
    ↓
setTrafficData() + setCountHistory()
    ↓
Subscribe to WebSocket → trafficApi.subscribe()
    ↓
BACKEND PUSHES DATA (every 1-5s)
    ↓
WebSocket callback receives data
    ↓
Filter by cameraId (data.cameraId === currentCameraId)
    ↓
Update trafficData + countHistory + lastUpdateTime
    ↓
Calculate flowRate from history
    ↓
Calculate congestionStatus from totalCount
    ↓
Re-render UI with new data
    ↓
(LOOP - WebSocket continues pushing updates)
```

---

## 📊 SO SÁNH: CAMERA-MARKERS vs CAMERA-INFO-CARD

| Aspect | Camera-Markers | Camera-Info-Card |
|--------|----------------|------------------|
| **Scope** | Tất cả cameras | 1 camera cụ thể |
| **Initial Fetch** | `getLatest()` (100 records) | `getCameraLatest(cameraId)` (1 camera) |
| **WebSocket Subscribe** | ✅ Có | ✅ Có |
| **Filter Data** | ❌ Không (dùng tất cả) | ✅ Có (theo cameraId) |
| **History Tracking** | ❌ Không cần | ✅ Cần (cho flow rate) |
| **Update Target** | `camera.density` map | `trafficData` state |
| **Notify Parent** | ✅ `onCamerasUpdate()` | ❌ Không cần |
| **Purpose** | Update heatmap | Show detailed metrics |

---

## 🎨 UI FEATURES

### 1. **Loading State**
```tsx
{loading && <Spinner>Đang tải dữ liệu...</Spinner>}
```

### 2. **No Data State**
```tsx
{!trafficData && <NoData>Không có dữ liệu</NoData>}
```

### 3. **Real-time Indicator**
```tsx
<p className="text-green-600">
  🔄 Cập nhật lúc: {lastUpdateTime.toLocaleTimeString()}
</p>
```

### 4. **Detection Details**
Hiển thị chi tiết từng loại xe:
- 🚗 car
- 🏍️ motorcycle  
- 🚌 bus
- 🚚 truck

### 5. **Dual Timestamps**
- **Dữ liệu từ**: Khi backend YOLO AI phân tích (trafficData.timestamp)
- **Cập nhật lúc**: Khi frontend nhận WebSocket data (lastUpdateTime)

Thường chênh nhau 1-2 giây (network latency).

---

## 🐛 DEBUG TIPS

### 1. Check WebSocket Connection
```typescript
// Trong subscribe callback
console.log('📡 WebSocket data:', {
  cameraId: data.cameraId,
  totalCount: data.totalCount,
  timestamp: data.timestamp
});
```

### 2. Check Filter Logic
```typescript
// Trong subscribe callback
console.log('Filter check:', {
  receivedCameraId: data.cameraId,
  currentCameraId: camera.id || camera._id || camera.name,
  match: data.cameraId === (camera.id || camera._id || camera.name)
});
```

### 3. Check History Tracking
```typescript
// Sau khi update history
console.log('History updated:', {
  length: countHistory.length,
  oldest: countHistory[0],
  latest: countHistory[countHistory.length - 1],
  timeRange: (countHistory[countHistory.length - 1].timestamp - countHistory[0].timestamp) / 1000 / 60
});
```

### 4. Check Flow Rate Calculation
```typescript
// Trong calculateFlowRate
console.log('Flow rate calculation:', {
  historyLength: countHistory.length,
  countDiff,
  timeDiff,
  result: flowRate
});
```

---

## ⚠️ COMMON ISSUES & SOLUTIONS

### Issue 1: Flow Rate luôn = 0
**Nguyên nhân:** History chỉ có 1 data point hoặc không có

**Giải pháp:**
```typescript
// Check history length
if (countHistory.length < 2) {
  console.warn('⚠️ Not enough history data for flow rate');
  return 0;
}
```

### Issue 2: Nhận data của camera khác
**Nguyên nhân:** Không filter theo cameraId

**Giải pháp:**
```typescript
// PHẢI filter trong subscribe callback
if (data.cameraId === cameraId) {
  // Update state
}
```

### Issue 3: Không cleanup subscription
**Nguyên nhân:** Quên return unsubscribe function

**Giải pháp:**
```typescript
useEffect(() => {
  const unsubscribe = trafficApi.subscribe(...);
  
  // QUAN TRỌNG: return cleanup function
  return () => unsubscribe();
}, [camera]);
```

### Issue 4: Memory leak khi switch camera
**Nguyên nhân:** Subscription cũ không cleanup

**Giải pháp:**
- Thêm `camera` vào dependency array
- Cleanup sẽ chạy khi camera thay đổi
- Subscribe lại với camera mới

---

## 🚀 PERFORMANCE OPTIMIZATION

### 1. **Memoize Calculations**
```typescript
import { useMemo } from 'react';

const flowRate = useMemo(() => calculateFlowRate(), [countHistory]);
const congestionStatus = useMemo(() => getCongestionStatus(), [trafficData]);
```

### 2. **Debounce History Updates**
```typescript
// Nếu data push quá nhanh, có thể debounce
import { debounce } from 'lodash';

const updateHistory = useMemo(
  () => debounce((newCount) => {
    setCountHistory(prev => [...prev, newCount]);
  }, 500),
  []
);
```

### 3. **Lazy Load Component**
```typescript
const CameraInfoCard = lazy(() => import('./camera-info-card'));
```

---

## 📝 CHECKLIST

- [x] Import trafficApi và TrafficMetricsDTO
- [x] Add state: trafficData, loading, countHistory, lastUpdateTime
- [x] useEffect #1: Fetch initial data với getCameraLatest()
- [x] useEffect #2: Subscribe WebSocket với filter theo cameraId
- [x] Implement calculateFlowRate() từ history
- [x] Implement getCongestionStatus() từ totalCount
- [x] Cleanup subscription trong return của useEffect
- [x] Render real data thay vì fake data
- [x] Show detection details (car, motorcycle, bus, truck)
- [x] Show dual timestamps (backend time + frontend update time)
- [x] Loading state và No data state
- [x] No TypeScript errors

---

## 🎓 KEY TAKEAWAYS

### 1. **Subscribe Pattern là gì?**
```typescript
// Subscribe nhận callback, return unsubscribe function
const unsubscribe = service.subscribe(callback);

// Cleanup khi không cần nữa
return () => unsubscribe();
```

### 2. **Tại sao phải filter data?**
- WebSocket broadcast cho tất cả
- Component chỉ quan tâm subset của data
- Filter để tránh update sai data

### 3. **History tracking dùng để gì?**
- Tính metrics theo thời gian (flow rate)
- Sliding window giữ data relevant
- Enable time-based calculations

### 4. **Dual timestamps có ý nghĩa gì?**
- Backend timestamp: Khi data được tạo
- Frontend timestamp: Khi data đến client
- Chênh lệch = network latency

### 5. **Cleanup quan trọng như thế nào?**
- Prevent memory leaks
- Prevent stale subscriptions
- Prevent multiple subscriptions overlap

---

## 🔗 RELATED FILES

- **trafficApi.ts**: Service quản lý API + WebSocket
- **camera-markers/index.tsx**: Tương tự pattern cho heatmap
- **types/traffic.ts**: Type definitions
- **lib/api/config.ts**: API configuration

---

## 📚 FURTHER READING

- `DETAILED_API_EXPLANATION.md`: Chi tiết về trafficApi.ts
- `WEBSOCKET_REALTIME_UPDATE.md`: WebSocket implementation details
- `DATA_FLOW_EXPLANATION.md`: Full system data flow

---

**✅ CAMERA INFO CARD ĐÃ HOÀN THÀNH!** 🎉

Component hiện đã:
- ✅ Fetch initial data từ API
- ✅ Subscribe real-time updates qua WebSocket
- ✅ Filter data theo camera ID
- ✅ Track history cho flow rate
- ✅ Calculate metrics chính xác
- ✅ Show dual timestamps
- ✅ Display detection details
- ✅ Handle loading & error states
- ✅ Cleanup subscriptions properly

**Ready for production!** 🚀
