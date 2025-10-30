# Dashboard Service

## 📝 Giới thiệu

**Dashboard Service** là một ứng dụng Spring Boot chịu trách nhiệm:

1.  **Tiêu thụ (Consume)** dữ liệu traffic đã được phân tích (số lượng xe, vị trí...) từ topic Kafka `traffic_metrics_topic`.
2.  **Lưu trữ** dữ liệu này vào database Postgres (`traffic_metrics` table).
3.  **Đẩy (Push)** dữ liệu real-time qua WebSocket đến các client frontend đang kết nối.
4.  **Cung cấp REST APIs** để frontend truy vấn dữ liệu lịch sử và tổng hợp.

## ✨ Chức năng chính

- **Kafka Consumer:** Lắng nghe topic `traffic_metrics_topic` và xử lý các message đến.
- **WebSocket:** Đẩy dữ liệu `TrafficMetricsDTO` mới nhất đến các client đã đăng ký (`/topic/traffic`).
- **REST APIs:** Cung cấp các endpoint để frontend lấy dữ liệu:
  - Lấy các bản ghi mới nhất.
  - Lấy dữ liệu tổng hợp theo quận (có lọc theo ngày).
  - Lấy dữ liệu chi tiết theo ngày (cho heatmap và danh sách, có lọc theo quận).
  - Lấy dữ liệu tổng hợp theo giờ trong ngày (cho biểu đồ 24h, có lọc theo quận).
- **Database:** Lưu trữ lịch sử dữ liệu traffic vào Postgres.

## 🚀 API Endpoints

Tất cả các endpoint đều có prefix là `/api/traffic`.

### 1. `GET /latest`

Lấy 100 bản ghi traffic mới nhất.

- **Tham số (Query Params - Tùy chọn):**
  - `district` (String): Lọc theo tên quận.
- **Ví dụ:**
  - `GET http://localhost:8085/api/traffic/latest` (Lấy mới nhất của tất cả quận)
  - `GET http://localhost:8085/api/traffic/latest?district=Quận 1` (Lấy mới nhất chỉ của Quận 1)
- **Phản hồi:** `List<TrafficMetric>`

### 2. `GET /summary/by-district`

Lấy tổng số lượng (`totalCount`) gom nhóm theo từng quận.

- **Tham số (Query Params - Tùy chọn):**
  - `date` (String, format `YYYY-MM-DD`): Lọc theo ngày. **Mặc định là ngày hôm nay** (theo giờ Việt Nam).
- **Ví dụ:**
  - `GET http://localhost:8085/api/traffic/summary/by-district` (Lấy summary của hôm nay)
  - `GET http://localhost:8085/api/traffic/summary/by-district?date=2025-10-30` (Lấy summary của ngày 30/10/2025)
- **Phản hồi:** `Map<String, Long>` (Key là tên quận, Value là tổng count)

### 3. `GET /by-date`

Lấy tất cả các bản ghi trong một ngày cụ thể (dùng cho heatmap và danh sách chi tiết).

- **Tham số (Query Params - Tùy chọn):**
  - `date` (String, format `YYYY-MM-DD`): Lọc theo ngày. **Mặc định là ngày hôm nay**.
  - `district` (String): Lọc theo tên quận.
- **Ví dụ:**
  - `GET http://localhost:8085/api/traffic/by-date` (Lấy tất cả bản ghi của hôm nay, mọi quận)
  - `GET http://localhost:8085/api/traffic/by-date?date=2025-10-30` (Lấy tất cả bản ghi của ngày 30/10/2025, mọi quận)
  - `GET http://localhost:8085/api/traffic/by-date?date=2025-10-30&district=Quận 1` (Lấy tất cả bản ghi của ngày 30/10/2025, chỉ Quận 1)
- **Phản hồi:** `List<TrafficMetric>`

### 4. `GET /hourly-summary`

Lấy tổng số lượng (`totalCount`) gom nhóm theo từng giờ trong một ngày cụ thể (dùng cho biểu đồ 24h).

- **Tham số (Query Params - Tùy chọn):**
  - `date` (String, format `YYYY-MM-DD`): Lọc theo ngày. **Mặc định là ngày hôm nay**.
  - `district` (String): Lọc theo tên quận.
- **Ví dụ:**
  - `GET http://localhost:8085/api/traffic/hourly-summary` (Lấy dữ liệu 24h hôm nay, mọi quận)
  - `GET http://localhost:8085/api/traffic/hourly-summary?district=Quận 1` (Lấy dữ liệu 24h hôm nay, chỉ Quận 1)
  - `GET http://localhost:8085/api/traffic/hourly-summary?date=2025-10-30&district=Quận 1` (Lấy dữ liệu 24h ngày 30/10/2025, chỉ Quận 1)
- **Phản hồi:** `Map<Integer, Long>` (Key là giờ (0-23), Value là tổng count trong giờ đó)

## 🔌 WebSocket

- **Endpoint kết nối:** `ws://localhost:8085/ws` _(Nếu gặp lỗi, thử `ws://localhost:8085/ws/websocket` nếu bạn chưa xóa `.withSockJS()`)_
- **Topic để đăng ký (Subscribe):** `/topic/traffic`
- **Dữ liệu đẩy ra:** `TrafficMetricsDTO` (JSON) mỗi khi có message mới từ Kafka.

## 🛠️ Cách chạy (Docker Compose)

1.  Đảm bảo bạn đã cài đặt Docker và Docker Compose.
2.  Mở file `backend/docker-compose.yml` và chắc chắn biến môi trường `APP_SIMULATE` của `dashboard-service` được đặt là `"false"` để tắt chế độ giả lập dữ liệu.
3.  Từ thư mục `backend/`, chạy lệnh:
    ```bash
    docker-compose up --build -d
    ```
    _(Lệnh này sẽ build (hoặc build lại nếu có thay đổi) và khởi chạy tất cả các service)_
4.  Kiểm tra log để đảm bảo service khởi động thành công:
    ```bash
    docker-compose logs -f dashboard-service
    ```

## ✅ Hướng dẫn Test

_(Giả định bạn đã `docker-compose up --build -d` và tất cả các service đang chạy)_

### 1. 🛑 Trước khi Test (Rất quan trọng)

Bạn cần **dữ liệu** trong database để test các bộ lọc (filter). API sẽ trả về `[]` (mảng rỗng) nếu không có dữ liệu.

1.  **Chờ dữ liệu chảy về:** Đảm bảo `ingestion-service` và `traffic-analysis-service` đang chạy và xử lý dữ liệu.
2.  **Lấy Tên Quận (District) để test:** Mở log của `traffic-analysis-service`:
    ```bash
    docker-compose logs -f traffic-analysis-service
    ```
    Hãy tìm một tên `district` (quận) thực tế mà service đang xử lý (ví dụ: "Quận 1", "Quận 12",...). Ghi nhớ tên quận này.
3.  **Lấy Ngày để test:** Log của `traffic-analysis-service` cũng sẽ cho bạn biết ngày hiện tại mà dữ liệu đang được xử lý (ví dụ: `2025-10-30`). Ghi nhớ ngày này.

### 2. 🚀 Hướng dẫn Test các API (dùng Postman)

Trong Postman, tạo các request **GET** đến các URL sau. Thay thế `Quận 1` và `2025-10-30` bằng dữ liệu thực tế bạn tìm được ở trên.

- **API 1:**
  - `http://localhost:8085/api/traffic/latest`
  - `http://localhost:8085/api/traffic/latest?district=Quận 1`
- **API 2:**
  - `http://localhost:8085/api/traffic/summary/by-district`
  - `http://localhost:8085/api/traffic/summary/by-district?date=2025-10-30`
- **API 3:**
  - `http://localhost:8085/api/traffic/by-date`
  - `http://localhost:8085/api/traffic/by-date?district=Quận 1`
  - `http://localhost:8085/api/traffic/by-date?date=2025-10-30&district=Quận 1`
- **API 4:**
  - `http://localhost:8085/api/traffic/hourly-summary`
  - `http://localhost:8085/api/traffic/hourly-summary?district=Quận 1`
  - `http://localhost:8085/api/traffic/hourly-summary?date=2025-10-30&district=Quận 1`

**Kiểm tra:** Mỗi request phải trả về mã `200 OK` và dữ liệu JSON tương ứng (hoặc `[]`, `{}` nếu chưa có dữ liệu khớp). Nếu gặp lỗi `500 Internal Server Error`, hãy kiểm tra log của `dashboard-service` để tìm Exception Java.

### 3. ⚡ Test WebSocket (Real-time, dùng extension như "Simple WebSocket Client")

1.  Mở **Simple WebSocket Client** (hoặc công cụ tương tự).
2.  Kết nối (OPEN) tới URL: `ws://localhost:8085/ws`
    _(Lưu ý: Dùng `ws://`, không phải `wss://`. Nếu vẫn "CLOSED", hãy kiểm tra xem bạn đã xóa `.withSockJS()` trong `WebSocketConfig.java` chưa, hoặc thử URL `ws://localhost:8085/ws/websocket`)._
3.  Trong ô **Request**, dán nội dung sau và nhấn **Send**:

    ```text
    SUBSCRIBE
    id:sub-1
    destination:/topic/traffic

    ```

    _(Phải có dòng trống ở cuối)_

4.  Để cửa sổ đó mở. Khi `traffic-analysis-service` gửi tin nhắn mới (bạn sẽ thấy trong log của nó), một JSON payload (`TrafficMetricsDTO`) sẽ **tự động xuất hiện** trong ô "Messages" của WebSocket client. Nếu thấy message nhảy về, chức năng real-time hoạt động tốt!
