# 🔧 Camera Info Card - WebSocket Real-time Update

## 📋 Vấn đề đã sửa

### **Vấn đề cũ:**

1. ❌ **Lưu lượng xe hiện 0:** Tính từ lúc click camera → không có dữ liệu lịch sử
2. ❌ **Cập nhật chậm:** Polling 30 giây một lần → không real-time
3. ❌ **Không efficient:** Gọi API liên tục thay vì dùng WebSocket

### **Giải pháp mới:**

1. ✅ **WebSocket real-time:** Nhận data liên tục từ backend
2. ✅ **Lưu lịch sử 2 phút:** Tính flow rate chính xác
3. ✅ **Hiệu quả:** Chỉ fetch initial data 1 lần, sau đó dùng WebSocket

---

## 🔄 Cách hoạt động mới

### **Flow chart:**

```
User click camera
    ↓
Component Mount
    ↓
1️⃣ Fetch initial data từ API (1 lần)
   GET /api/traffic/camera/{cameraId}/latest
   → Hiển thị ngay dữ liệu ban đầu
   → Khởi tạo history với 1 data point
    ↓
2️⃣ Connect WebSocket
   ws://localhost:8085/ws
   Subscribe: /topic/traffic
    ↓
3️⃣ Nhận messages real-time (mỗi vài giây)
   {
     "cameraId": "TTH-29.4",
     "totalCount": 15,
     "timestamp": "..."
   }
    ↓
4️⃣ Filter chỉ messages của camera này
   if (data.cameraId === myCameraId) {
     - Update vehicleCount
     - Update congestionStatus
     - Add to countHistory
     - Calculate flowRate
   }
    ↓
5️⃣ Display real-time metrics
   ✅ Số lượng xe: 15 (từ WebSocket)
   ✅ Lưu lượng: 12 xe/phút (tính từ history)
   ✅ Tình trạng: THẤP (based on count)
```

---

## 💡 Lưu lượng xe - Cách tính mới

### **Cấu trúc dữ liệu:**

```typescript
// Lưu cả count VÀ timestamp
countHistoryRef.current = [
  { count: 10, timestamp: 1699350000000 },  // 2 phút trước
  { count: 12, timestamp: 1699350010000 },  // 1:50 trước
  { count: 15, timestamp: 1699350020000 },  // 1:40 trước
  // ... more data points
  { count: 25, timestamp: 1699350120000 },  // Hiện tại
];
```

### **Algorithm tính flow rate:**

```typescript
const calculateFlowRate = () => {
  const history = countHistoryRef.current;
  
  if (history.length < 2) {
    setFlowRate(0); // Chưa đủ data
    return;
  }

  // Lấy điểm đầu và cuối
  const oldest = history[0];
  const newest = history[history.length - 1];
  
  // Tính thời gian chênh lệch (phút)
  const timeDiffMs = newest.timestamp - oldest.timestamp;
  const timeDiffMinutes = timeDiffMs / 60000;
  
  // Nếu < 6 giây, chưa đủ data
  if (timeDiffMinutes < 0.1) {
    setFlowRate(0);
    return;
  }
  
  // Tính sự thay đổi số lượng xe (dùng abs vì có thể tăng/giảm)
  const countDiff = Math.abs(newest.count - oldest.count);
  
  // Tính xe/phút
  const rate = Math.round(countDiff / timeDiffMinutes);
  
  setFlowRate(rate);
};
```

### **Ví dụ cụ thể:**

```javascript
// Giả sử history có 120 giây data (2 phút)
oldest: { count: 10, timestamp: 1699350000000 }
newest: { count: 30, timestamp: 1699350120000 }

// Tính toán:
timeDiff = 120000 ms = 2 phút
countDiff = |30 - 10| = 20 xe
flowRate = 20 xe / 2 phút = 10 xe/phút
```

---

## 📊 WebSocket Integration

### **Setup:**

```typescript
const client = new Client({
  webSocketFactory: () => new SockJS('http://localhost:8085/ws'),
  onConnect: () => {
    // Subscribe to traffic topic
    client.subscribe('/topic/traffic', (message) => {
      const data = JSON.parse(message.body);
      
      // Chỉ xử lý message của camera này
      if (data.cameraId === cameraId) {
        // Update states
        setVehicleCount(data.totalCount);
        updateCongestionStatus(data.totalCount);
        
        // Add to history
        countHistoryRef.current.push({
          count: data.totalCount,
          timestamp: Date.now()
        });
        
        // Giữ chỉ 2 phút gần nhất
        const twoMinutesAgo = Date.now() - 120000;
        countHistoryRef.current = countHistoryRef.current.filter(
          item => item.timestamp > twoMinutesAgo
        );
        
        // Tính flow rate
        calculateFlowRate();
      }
    });
  }
});
```

### **Frequency:**

| Event | Frequency | Source |
|-------|-----------|--------|
| **WebSocket messages** | ~1-5 giây | Backend push |
| **Vehicle count update** | Real-time | WebSocket |
| **Flow rate calculation** | Mỗi khi có message mới | Client-side |
| **Congestion status** | Real-time | Client-side |
| **History cleanup** | Mỗi message | Keep 2 phút |

---

## 🎯 Data States

### **States:**

```typescript
// Main data from API/WebSocket
const [trafficData, setTrafficData] = useState<TrafficMetricsDTO | null>(null);
const [loading, setLoading] = useState<boolean>(true);

// Derived metrics
const [vehicleCount, setVehicleCount] = useState<number>(0);
const [flowRate, setFlowRate] = useState<number>(0);
const [congestionStatus, setCongestionStatus] = useState<'CAO' | 'TRUNG BÌNH' | 'THẤP'>('THẤP');

// WebSocket client
const stompClientRef = useRef<Client | null>(null);

// Flow rate calculation history (2 phút)
const countHistoryRef = useRef<Array<{ count: number; timestamp: number }>>([]);
```

### **Lifecycle:**

```
Component Mount
    ↓
1. loading = true
2. Fetch initial data
3. Initialize history: [{ count: 10, timestamp: now }]
4. loading = false
5. Connect WebSocket
    ↓
Receiving Messages (continuous)
    ↓
1. Parse message
2. Check if message.cameraId matches
3. Update vehicleCount
4. Update congestionStatus
5. Push to history
6. Cleanup old history (> 2 min)
7. Calculate flowRate
    ↓
Component Unmount
    ↓
1. Disconnect WebSocket
```

---

## 🔢 Congestion Status Logic

```typescript
const updateCongestionStatus = (count: number) => {
  if (count > 80) {
    setCongestionStatus('CAO');      // 🔴 Red badge
  } else if (count > 40) {
    setCongestionStatus('TRUNG BÌNH'); // 🟡 Yellow badge
  } else {
    setCongestionStatus('THẤP');       // 🟢 Green badge
  }
};
```

**Visual indicators:**

| Vehicle Count | Status | Color | Meaning |
|---------------|--------|-------|---------|
| 0-40 | THẤP | 🟢 Green | Giao thông thông thoáng |
| 41-80 | TRUNG BÌNH | 🟡 Yellow | Giao thông khá đông |
| 81+ | CAO | 🔴 Red | Giao thông rất đông, có thể kẹt xe |

---

## 🎨 UI Display

### **Real-time updates:**

```tsx
<StatCardWithProgress
  label="Số lượng xe"
  value={`${vehicleCount} xe`}        // ← WebSocket real-time
  progressPercent={Math.min(vehicleCount, 100)}
  progressColorClass="bg-blue-500"
/>

<StatCardWithProgress
  label="Lưu lượng xe"
  value={`${flowRate} xe/phút`}      // ← Calculated from history
  progressPercent={Math.min(flowRate * 1.5, 100)}
  progressColorClass="bg-purple-500"
/>

<StatCardWithBadge
  label="Tình trạng kẹt xe"
  badgeText={congestionStatus}        // ← Based on vehicleCount
  badgeColorClass={getCongestionColor(congestionStatus)}
/>
```

### **Detection details (from API/WebSocket):**

```tsx
{trafficData?.detectionDetails && (
  <div className="bg-white rounded-lg p-3">
    <h4>Chi tiết phương tiện</h4>
    <div className="grid grid-cols-2 gap-2">
      {trafficData.detectionDetails.car !== undefined && (
        <div>🚗 Ô tô: {trafficData.detectionDetails.car}</div>
      )}
      {trafficData.detectionDetails.motorcycle !== undefined && (
        <div>🏍️ Xe máy: {trafficData.detectionDetails.motorcycle}</div>
      )}
      {trafficData.detectionDetails.truck !== undefined && (
        <div>🚛 Xe tải: {trafficData.detectionDetails.truck}</div>
      )}
      {trafficData.detectionDetails.bus !== undefined && (
        <div>🚌 Xe buýt: {trafficData.detectionDetails.bus}</div>
      )}
    </div>
    <p>Cập nhật: {new Date(trafficData.timestamp).toLocaleString('vi-VN')}</p>
  </div>
)}
```

---

## 🐛 Tại sao flow rate thường là 0?

### **Nguyên nhân:**

1. **Chưa đủ dữ liệu:** Cần ít nhất 2 data points (6+ giây)
2. **Dữ liệu không thay đổi:** Nếu vehicleCount không đổi → flowRate = 0
3. **WebSocket chưa connect:** Đang chờ initial connection

### **Giải pháp:**

```typescript
// Check 1: Đủ data points chưa?
if (history.length < 2) {
  setFlowRate(0);
  return;
}

// Check 2: Đủ thời gian chưa?
if (timeDiffMinutes < 0.1) { // < 6 giây
  setFlowRate(0);
  return;
}

// Check 3: Có thay đổi không?
const countDiff = Math.abs(newest.count - oldest.count);
// Dùng abs() để catch cả tăng và giảm
```

### **Timeline example:**

```
t=0s:   Click camera
        → Fetch initial data
        → history = [{ count: 10, timestamp: 0 }]
        → flowRate = 0 (chưa đủ data)

t=5s:   WebSocket message #1
        → history = [{ count: 10, t: 0 }, { count: 10, t: 5000 }]
        → countDiff = 0, flowRate = 0 (không thay đổi)

t=10s:  WebSocket message #2
        → history = [..., { count: 15, t: 10000 }]
        → timeDiff = 10s = 0.167 phút
        → countDiff = |15 - 10| = 5
        → flowRate = 5 / 0.167 = 30 xe/phút ✅

t=120s: 2 phút sau
        → history có ~24 data points (mỗi 5s)
        → timeDiff = 120s = 2 phút
        → countDiff = |25 - 10| = 15
        → flowRate = 15 / 2 = 7.5 = 8 xe/phút ✅
```

---

## 📈 Performance Optimizations

### **1. History Management:**

```typescript
// Chỉ giữ 2 phút gần nhất → không tăng memory
const twoMinutesAgo = Date.now() - 120000;
countHistoryRef.current = countHistoryRef.current.filter(
  item => item.timestamp > twoMinutesAgo
);
```

**Kết quả:** Max ~120-240 data points (2 phút × 1-2 msg/s)

### **2. Efficient Filtering:**

```typescript
// Chỉ process messages của camera này
if (data.cameraId === cameraId) {
  // ... update logic
}
```

### **3. Refs instead of State:**

```typescript
// Dùng ref cho history → không trigger re-render
const countHistoryRef = useRef<Array<{...}>>([]);
```

---

## ✅ Testing Guide

### **1. Backend Running:**

```bash
cd backend
docker compose up -d
```

**Verify WebSocket:**
```bash
# Check dashboard-service logs
docker compose logs -f dashboard-service

# Should see WebSocket messages
```

### **2. Frontend Running:**

```bash
cd frontend
npm run dev
```

### **3. Test Flow:**

1. ✅ Open browser console (F12)
2. ✅ Click camera marker
3. ✅ See console log: `✅ WebSocket connected for camera TTH-29.4`
4. ✅ Initial data loads (from API)
5. ✅ Flow rate = 0 (chưa đủ data)
6. ✅ Wait 10-20 giây
7. ✅ Flow rate bắt đầu hiện số (có đủ 2+ data points)
8. ✅ Vehicle count cập nhật real-time
9. ✅ Congestion status thay đổi theo count

### **4. Debug Commands:**

**Browser Console:**
```javascript
// Check WebSocket connection
// Should see: ✅ WebSocket connected for camera ...

// Check data updates
// Should see real-time vehicle counts
```

**Check backend data:**
```bash
curl http://localhost:8085/api/traffic/camera/TTH-29.4/latest
```

---

## 🎉 Summary

### **Thay đổi chính:**

| Feature | Cũ | Mới |
|---------|-----|-----|
| **Data source** | API polling 30s | WebSocket real-time |
| **Update frequency** | 30 giây | 1-5 giây |
| **Flow rate** | Tính từ lúc click → 0 | Tính từ history 2 phút → chính xác |
| **History tracking** | Không có | Lưu 2 phút gần nhất |
| **Efficiency** | Gọi API liên tục | Fetch 1 lần + WebSocket |
| **Real-time** | ❌ Không | ✅ Có |

### **Kết quả:**

✅ **Vehicle Count:** Real-time từ WebSocket  
✅ **Flow Rate:** Tính chính xác từ lịch sử 2 phút  
✅ **Congestion Status:** Update real-time based on count  
✅ **Detection Details:** Hiển thị chi tiết từng loại xe  
✅ **Performance:** Efficient, không duplicate API calls  

---

🎊 **Camera Info Card giờ đã hoạt động 100% real-time với WebSocket!**
