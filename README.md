# Traffic Streaming Platform - Hướng dẫn triển khai (Deployment Guide)

## Yêu cầu tiên quyết

Trước khi bắt đầu, hãy đảm bảo máy của bạn đã cài đặt:
1.  **Docker Desktop** (hoặc Docker Engine & Docker Compose).
2.  **Git** (để clone source code).
3.  **(Tùy chọn)** **NVIDIA Container Toolkit** nếu bạn muốn chạy `traffic-analysis-service` với hỗ trợ GPU.


## Cấu trúc hệ thống

Hệ thống được triển khai trọn gói bao gồm:

*   **Backend**: Các microservices (Java/Python), Kafka, PostgreSQL, MinIO.
*   **Frontend**: Ứng dụng web Next.js.
*   **Monitoring Stack**: Prometheus, Grafana, Alertmanager, cAdvisor, Node Exporter.

## Hướng dẫn triển khai 

### 1. Cấu hình biến môi trường

Kiểm tra file `.env` tại thư mục gốc. File này chứa các cấu hình quan trọng như mật khẩu database, cổng dịch vụ, API keys. Đảm bảo các giá trị đã được thiết lập chính xác.

### 2. Khởi chạy hệ thống

Tại thư mục gốc của dự án (nơi chứa file `docker-compose.yml`), chạy lệnh:

```bash
docker-compose up -d --build
```

*Lệnh này sẽ tự động build và khởi chạy tất cả các dịch vụ Backend, Frontend và Monitoring.*

### 3. Kiểm tra trạng thái

```bash
docker-compose ps
```

Đảm bảo các container đều ở trạng thái `Up` (hoặc `healthy`).

### Lưu ý về GPU (Traffic Analysis Service)

Dịch vụ `traffic-analysis-service` được cấu hình mặc định sử dụng GPU NVIDIA.
Nếu máy bạn **không có GPU NVIDIA** hoặc chưa cài đặt NVIDIA Container Toolkit:
1.  Mở file `docker-compose.yml`.
2.  Tìm service `traffic-analysis-service`.
3.  **Comment (vô hiệu hóa)** phần cấu hình `deploy` -> `resources`.

## Thông tin truy cập & cổng (ports)

Dưới đây là danh sách các dịch vụ và cổng truy cập:

| Dịch vụ | Cổng (Port) | URL / Credentials mặc định | Mô tả |
| :--- | :--- | :--- | :--- |
| **Frontend App** | `3001` | `http://localhost:3001` | Giao diện người dùng  |
| **Grafana** | `3000` | `http://localhost:3000`<br>User/Pass: xem trong `.env` (thường là `admin`/`admin`) | Dashboard giám sát hệ thống |
| **Prometheus** | `9090` | `http://localhost:9090` | Hệ thống thu thập metrics |
| **Alertmanager** | `9093` | `http://localhost:9093` | Quản lý cảnh báo |
| **Dashboard Service** | `6677` | `http://localhost:6677` | API Gateway / Backend chính |
| **PostgreSQL** | `5432` | `jdbc:postgresql://localhost:5432/traffic_db` | Cơ sở dữ liệu chính |
| **PgAdmin** | `5050` | `http://localhost:5050` | Quản lý Database UI |
| **MinIO Console** | `9001` | `http://localhost:9001` | Quản lý Object Storage |
| **Kafka Broker** | `9092` | `localhost:9092` | Message Broker |

*(Lưu ý: Cổng Frontend đã được đổi sang **3001** để tránh xung đột với Grafana chạy mặc định ở cổng 3000)*


## Các lệnh quản lý thường dùng

*   **Dừng toàn bộ hệ thống:**
    ```bash
    docker-compose down
    ```

*   **Xem logs của một dịch vụ (ví dụ: frontend):**
    ```bash
    docker-compose logs -f frontend
    ```

*   **Khởi động lại một dịch vụ:**
    ```bash
    docker-compose restart <tên-service>
    ```

*   **Build lại một dịch vụ cụ thể (khi sửa code):**
    ```bash
    docker-compose up -d --build <tên-service>
    # Ví dụ: docker-compose up -d --build frontend
    ```

## Troubleshooting

1.  **Xung đột cổng (Port Conflict):**
    *   Kiểm tra xem các cổng `3000`, `3001`, `5432`, `8080` có đang bị chiếm dụng bởi ứng dụng khác không.
    *   Nếu có, hãy tắt ứng dụng đó hoặc sửa đổi cổng trong file `docker-compose.yml` và `.env`.

2.  **Lỗi kết nối Database/Kafka:**
    *   Các dịch vụ Java/Python có thể khởi động lại vài lần (restart) trước khi kết nối thành công với Database/Kafka do các dịch vụ hạ tầng cần thời gian khởi động. Đây là hiện tượng bình thường.

3.  **Frontend không kết nối được Backend:**
    *   Đảm bảo biến môi trường `NEXT_PUBLIC_API_URL` trong phần `frontend` của `docker-compose.yml` trỏ đúng địa chỉ Backend (thường là `http://localhost:6677` khi chạy local).
