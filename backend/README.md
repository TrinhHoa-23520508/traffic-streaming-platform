# 🚀 Backend Services - Traffic Streaming Platform

## 📋 Tổng quan kiến trúc

Backend của Traffic Streaming Platform bao gồm **4 microservices** chính:

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRAFFIC STREAMING PLATFORM                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📥 INGESTION SERVICE (Port 8080)                                │
│     ├─ Fetch data từ External API                                │
│     ├─ Push raw camera data vào Kafka                            │
│     └─ Topic: hcm_traffic_data                                   │
│                                                                   │
│  🤖 TRAFFIC ANALYSIS SERVICE (Port 8082)                         │
│     ├─ Consume từ: hcm_traffic_data                              │
│     ├─ YOLO11 AI: Detect vehicles (car, motorcycle, bus, truck)  │
│     ├─ Upload processed images to MinIO                          │
│     └─ Produce to: traffic_metrics_topic                         │
│                                                                   │
│  📊 DASHBOARD SERVICE (Port 8085) ⭐ MAIN API                    │
│     ├─ Consume từ: traffic_metrics_topic                         │
│     ├─ Store metrics to PostgreSQL                               │
│     ├─ WebSocket: Real-time push to frontend                     │
│     └─ REST APIs: Query historical & aggregated data             │
│                                                                   │
│  🗄️  IMAGE STORAGE SERVICE (Port 8081) [Optional - Disabled]    │
│     └─ Handle image upload/download to MinIO                     │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                     INFRASTRUCTURE SERVICES                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  📨 Apache Kafka (Port 9092)                                     │
│     ├─ Zookeeper (Port 2181)                                     │
│     ├─ Topic 1: hcm_traffic_data (raw camera data)               │
│     └─ Topic 2: traffic_metrics_topic (analyzed metrics)         │
│                                                                   │
│  🐘 PostgreSQL (Port 5432)                                       │
│     ├─ Database: traffic_db                                      │
│     └─ Table: traffic_metrics                                    │
│                                                                   │
│  🗂️  MinIO (Port 9000, Console: 9001)                           │
│     ├─ Bucket: traffic-images (raw)                              │
│     └─ Bucket: traffic-analyzed-images (with detection boxes)    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 API Endpoints Chi tiết

### 📥 **1. Ingestion Service** (Port 8080)

Base URL: `http://localhost:8080/api/v1/traffic`

| Endpoint | Method | Mô tả | Response |
|----------|--------|-------|----------|
| `/ping` | GET | Health check | `"pong"` |
| `/fetch` | GET | Fetch camera data từ external API và push to Kafka | `"Fetched data from external API and pushed to Kafka."` |
| `/ingest` | POST | Manual ingest camera data | `"Dữ liệu giao thông từ camera {id} đã được gửi vào hàng đợi xử lý."` |

**Example:**
```powershell
# Health check
curl http://localhost:8080/api/v1/traffic/ping

# Fetch data from external API
curl http://localhost:8080/api/v1/traffic/fetch
```

---

### 📊 **2. Dashboard Service** (Port 8085) ⭐ **MAIN API FOR FRONTEND**

Base URL: `http://localhost:8085/api/traffic`

#### **API 1: Get Latest Traffic Metrics**

```http
GET /latest
GET /latest?district={districtName}
```

**Mô tả:** Lấy 100 bản ghi traffic mới nhất

**Query Params:**
- `district` (optional): Lọc theo tên quận (e.g., "Quận 1", "Quận Tân Bình")

**Response:** `List<TrafficMetric>`

**Example:**
```powershell
# Get all latest
curl http://localhost:8085/api/traffic/latest

# Filter by district
curl "http://localhost:8085/api/traffic/latest?district=Quận 1"
```

---

#### **API 2: Get Summary by District**

```http
GET /summary/by-district
GET /summary/by-district?date={YYYY-MM-DD}
```

**Mô tả:** Tổng hợp số lượng xe theo quận

**Query Params:**
- `date` (optional): Lọc theo ngày (format: `YYYY-MM-DD`). Mặc định: hôm nay

**Response:** `Map<String, Long>` (Key = district name, Value = total count)

**Example:**
```powershell
# Today's summary
curl http://localhost:8085/api/traffic/summary/by-district

# Specific date
curl "http://localhost:8085/api/traffic/summary/by-district?date=2025-11-06"
```

**Response Example:**
```json
{
  "Quận 1": 1250,
  "Quận Tân Bình": 980,
  "Quận 3": 750
}
```

---

#### **API 3: Get Traffic Data by Date**

```http
GET /by-date
GET /by-date?date={YYYY-MM-DD}
GET /by-date?date={YYYY-MM-DD}&cameraId={cameraId}
```

**Mô tả:** Lấy tất cả records theo ngày (dùng cho heatmap & detailed list)

**Query Params:**
- `date` (optional): Lọc theo ngày. Mặc định: hôm nay
- `cameraId` (optional): Lọc theo ID camera cụ thể

**Response:** `List<TrafficMetric>`

**Example:**
```powershell
# All records today
curl http://localhost:8085/api/traffic/by-date

# Specific date
curl "http://localhost:8085/api/traffic/by-date?date=2025-11-06"

# Specific date and camera
curl "http://localhost:8085/api/traffic/by-date?date=2025-11-06&cameraId=CAM001"
```

---

#### **API 4: Get Hourly Summary**

```http
GET /hourly-summary
GET /hourly-summary?date={YYYY-MM-DD}&district={districtName}
```

**Mô tả:** Tổng hợp theo giờ (0-23) trong ngày - cho biểu đồ 24h

**Query Params:**
- `date` (optional): Lọc theo ngày. Mặc định: hôm nay
- `district` (optional): Lọc theo quận

**Response:** `Map<Integer, Long>` (Key = hour (0-23), Value = total count)

**Example:**
```powershell
# Today's hourly summary (all districts)
curl http://localhost:8085/api/traffic/hourly-summary

# Filter by district
curl "http://localhost:8085/api/traffic/hourly-summary?district=Quận 1"

# Specific date and district
curl "http://localhost:8085/api/traffic/hourly-summary?date=2025-11-06&district=Quận 1"
```

**Response Example:**
```json
{
  "0": 50,
  "1": 30,
  "2": 15,
  "7": 200,
  "8": 350,
  "17": 400,
  "23": 80
}
```

---

#### **API 5: Get Latest Metric for Specific Camera**

```http
GET /camera/{cameraId}/latest
```

**Mô tả:** Lấy bản ghi MỚI NHẤT của 1 camera cụ thể

**Path Variable:**
- `cameraId`: ID của camera

**Response:** `TrafficMetric` hoặc `404 Not Found`

**Example:**
```powershell
curl http://localhost:8085/api/traffic/camera/TTH-29.4/latest
```

---

### 🔌 **WebSocket Real-time Updates**

**Connection URL:** `ws://localhost:8085/ws`  
**Topic to Subscribe:** `/topic/traffic`

**Mô tả:** Nhận real-time traffic metrics mỗi khi có data mới từ Kafka

**Protocol:** STOMP over SockJS

**Example (JavaScript):**
```javascript
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const client = new Client({
  webSocketFactory: () => new SockJS('http://localhost:8085/ws'),
  onConnect: () => {
    client.subscribe('/topic/traffic', (message) => {
      const data = JSON.parse(message.body);
      console.log('Real-time traffic:', data);
    });
  }
});

client.activate();
```

**Data Format (TrafficMetricsDTO):**
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
  "timestamp": "2025-11-07T08:30:15.000Z"
}
```

---

## 🗄️ Database Schema

### **Table: traffic_metrics**

```sql
CREATE TABLE traffic_metrics (
    id BIGSERIAL PRIMARY KEY,
    camera_id VARCHAR(255) NOT NULL,
    camera_name VARCHAR(255),
    district VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    car INTEGER DEFAULT 0,
    motorcycle INTEGER DEFAULT 0,
    truck INTEGER DEFAULT 0,
    bus INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_timestamp ON traffic_metrics(timestamp);
CREATE INDEX idx_camera_id ON traffic_metrics(camera_id);
CREATE INDEX idx_district ON traffic_metrics(district);
```

---

## 🚀 Cách chạy Backend

### **Prerequisites:**
- Docker Desktop (đã khởi động)
- 8GB RAM minimum
- GPU (optional, cho YOLO analysis)

### **Bước 1: Start all services**

```powershell
cd backend
docker compose up --build -d
```

**Thời gian:** 3-5 phút (lần đầu tiên)

### **Bước 2: Verify services running**

```powershell
docker compose ps
```

**Expected output:**
```
NAME                             STATUS
broker                          running (healthy)
minio                           running (healthy)
postgres_db                     running
zookeeper                       running
backend-ingestion-service-1     running
backend-traffic-analysis-service-1  running
backend-dashboard-service-1     running
```

### **Bước 3: Check logs**

```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f dashboard-service
docker compose logs -f traffic-analysis-service
```

### **Bước 4: Initialize data**

```powershell
# Fetch camera data from external API
curl http://localhost:8080/api/v1/traffic/fetch
```

Sau 10-20 giây, data sẽ được xử lý và lưu vào database.

### **Bước 5: Test APIs**

```powershell
# Get latest traffic data
curl http://localhost:8085/api/traffic/latest

# Get district summary
curl http://localhost:8085/api/traffic/summary/by-district

# Get hourly summary
curl http://localhost:8085/api/traffic/hourly-summary
```

---

## 📊 Data Flow

```
External API (api.notis.vn)
    ↓
[Ingestion Service] → Fetch camera list
    ↓
Kafka Topic: hcm_traffic_data
    ↓
[Traffic Analysis Service] → YOLO11 Detection
    ↓
Kafka Topic: traffic_metrics_topic
    ↓
[Dashboard Service] → Store + WebSocket Broadcast
    ↓ ↓
    PostgreSQL     Frontend (WebSocket)
```

---

## 🛑 Stop & Cleanup

### **Stop all services**
```powershell
docker compose down
```

### **Stop and remove volumes (reset database)**
```powershell
docker compose down -v
```

### **Restart specific service**
```powershell
docker compose restart dashboard-service
```

### **Rebuild after code changes**
```powershell
docker compose up --build -d dashboard-service
```

---

## 🔧 Configuration

### **Environment Variables**

#### **Dashboard Service:**
```yaml
KAFKA_BOOTSTRAP_SERVERS: broker:29092
SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/traffic_db
SPRING_DATASOURCE_USERNAME: postgres
SPRING_DATASOURCE_PASSWORD: admin
APP_SIMULATE: "false"  # Set "true" for fake data testing
```

#### **Traffic Analysis Service:**
```yaml
KAFKA_BROKER: broker:29092
IMAGE_BASE_URL: https://api.notis.vn/v4/
MINIO_ENDPOINT: minio:9000
MINIO_ACCESS_KEY: minioadmin
MINIO_SECRET_KEY: minioadmin
MINIO_BUCKET_NAME: traffic-analyzed-images
```

---

## 🧪 Testing Guide

### **1. Test Ingestion Service**
```powershell
# Health check
curl http://localhost:8080/api/v1/traffic/ping
# Expected: "pong"

# Fetch data
curl http://localhost:8080/api/v1/traffic/fetch
# Expected: "Fetched data from external API and pushed to Kafka."
```

### **2. Test Dashboard Service APIs**
```powershell
# Latest records
curl http://localhost:8085/api/traffic/latest

# District summary
curl http://localhost:8085/api/traffic/summary/by-district

# Hourly summary
curl http://localhost:8085/api/traffic/hourly-summary
```

### **3. Test WebSocket**

Use **Simple WebSocket Client** extension:

1. Connect to: `ws://localhost:8085/ws`
2. Send SUBSCRIBE message:
```
SUBSCRIBE
id:sub-1
destination:/topic/traffic

```
3. Wait for real-time messages to appear

### **4. Test Kafka Consumer**
```powershell
# View raw camera data
docker compose exec broker kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic hcm_traffic_data \
  --from-beginning

# View analyzed metrics
docker compose exec broker kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic traffic_metrics_topic \
  --from-beginning
```

### **5. Test Database**
```powershell
# Connect to PostgreSQL
docker compose exec postgres psql -U postgres -d traffic_db

# Query data
SELECT COUNT(*) FROM traffic_metrics;
SELECT * FROM traffic_metrics ORDER BY timestamp DESC LIMIT 5;

# Exit
\q
```

---

## 🐛 Troubleshooting

### **❌ No data in database**

**Cause:** Services chưa process data hoặc Kafka topics chưa có message

**Solution:**
1. Run fetch endpoint: `curl http://localhost:8080/api/v1/traffic/fetch`
2. Wait 20-30 seconds for processing
3. Check logs: `docker compose logs -f traffic-analysis-service`

---

### **❌ WebSocket connection failed**

**Cause:** Dashboard service chưa start hoặc CORS issues

**Solution:**
1. Check service running: `docker compose ps`
2. Check logs: `docker compose logs -f dashboard-service`
3. Verify URL: `ws://localhost:8085/ws` (not `wss://`)

---

### **❌ Kafka consumer not receiving messages**

**Cause:** Kafka chưa sẵn sàng hoặc topics chưa tạo

**Solution:**
1. Wait for Kafka healthcheck: `docker compose ps` (should show "healthy")
2. List topics: `docker compose exec broker kafka-topics --bootstrap-server localhost:9092 --list`
3. Check producer logs: `docker compose logs -f ingestion-service`

---

### **❌ Traffic Analysis Service crash (GPU error)**

**Cause:** NVIDIA GPU drivers chưa cài hoặc không có GPU

**Solution:**

**Option 1 - Disable GPU:**
Edit `docker-compose.yml`, comment out:
```yaml
# deploy:
#   resources:
#     reservations:
#       devices:
#         - driver: nvidia
#           count: 1
#           capabilities: [gpu]
```

**Option 2 - Install NVIDIA Container Toolkit:**
https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html

---

## 📚 Documentation Links

- **Dashboard Service README:** `backend/dashboard-service/README.md`
- **Frontend API Guide:** `frontend/API_USAGE_GUIDE.md`
- **Traffic Analysis Service:** `backend/traffic-analysis-service/README.md`

---

## 🎯 Quick Reference

### **Service Ports**
- Ingestion Service: `8080`
- Traffic Analysis Service: `8082`
- **Dashboard Service (Main API): `8085`** ⭐
- PostgreSQL: `5432`
- Kafka: `9092`
- MinIO: `9000` (API), `9001` (Console)

### **Database Credentials**
- Host: `localhost:5432`
- Database: `traffic_db`
- Username: `postgres`
- Password: `admin`

### **MinIO Credentials**
- Console: http://localhost:9001
- Username: `minioadmin`
- Password: `minioadmin`

### **Kafka Topics**
- `hcm_traffic_data` - Raw camera data
- `traffic_metrics_topic` - Analyzed metrics

---

## ✅ Health Check Checklist

- [ ] Docker Desktop running
- [ ] All services status = `running`
- [ ] Kafka status = `healthy`
- [ ] MinIO status = `healthy`
- [ ] `curl http://localhost:8080/api/v1/traffic/ping` → `"pong"`
- [ ] `curl http://localhost:8085/api/traffic/latest` → Returns data
- [ ] WebSocket connects to `ws://localhost:8085/ws`
- [ ] PostgreSQL accessible at `localhost:5432`

---

🎉 **Backend is ready! Connect your frontend to these APIs for real-time traffic monitoring!**
