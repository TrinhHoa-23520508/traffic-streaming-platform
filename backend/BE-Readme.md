HƯỚNG DẪN CHẠY BACKEND TRAFFIC APP

Các công cụ cần có:
- IDE: IntelliJ
- Docker Desktop
- Postman (test API)

Hướng dẫn từng bước:
- Step 1: Cài đặt, khởi chạy Docker Desktop
- Step 2: Mở terminal trong IDE, chạy câu lệnh: docker compose up --build
- Step 3: Mở Postman, nhập url POST: http://localhost:8080/api/v1/traffic/ingest -> Vào Body, nhập:

{

  "cameraId": "CAM-001-SOUTH",

  "timestamp": 1678886400000,

  "snapshotUrl": "http://example.com/snapshots/cam001/20230315_100000.jpg",

  "vehicleCount": 45

}

Kết quả mong đợi: "Dữ liệu giao thông từ camera CAM001 đã được gửi vào hàng đợi xử lý."