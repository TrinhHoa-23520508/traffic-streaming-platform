HƯỚNG DẪN CHẠY BACKEND TRAFFIC APP (ĐÃ FETCH ĐƯỢC API)

Các công cụ cần có:
- IDE: IntelliJ
- Docker Desktop
- Postman (test API)

Hướng dẫn từng bước:
- Step 1: Cài đặt, khởi chạy Docker Desktop
- Step 2: Mở terminal trong IDE, cd backend, chạy câu lệnh: docker compose up --build
- Step 3: Chạy: curl -v http://localhost:8080/api/v1/traffic/ping (optional để kiểm tra đã được khởi động chưa)
- Step 4: Chạy: curl -v http://localhost:8080/api/v1/traffic/fetch (để fetch dữ liệu và send to Kafka)
- Step 4: Chạy: docker-compose exec broker kafka-console-consumer --bootstrap-server localhost:9092 --topic hcm_traffic_data --from-beginning

Kết quả mong đợi: Danh sách camera raw data sẽ hiển thị trong terminal chạy câu lệnh trên
-> Sẵn sàng để consumer tiếp theo (processing_service) sử dụng.
