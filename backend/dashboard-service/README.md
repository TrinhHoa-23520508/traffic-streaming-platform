DASHBOARD SERVICE

Tiến độ hiện tại: 
- Fake  Data thành công
- Tạo topic thủ công (sau này sẽ bỏ vì processing-service sẽ tạo)
- Chuẩn hóa data theo TrafficMetricsDTO -> Consume được dữ liệu
- Khung căn bản của Entity theo mẫu Hiếu gửi trong zalo (hoặc không nếu Processing-service đảm nhận, nhưng Dashboard lưu sẽ hợp lý hơn (họp sau))
- REST API hoạt động tốt, có thể truy cập qua Postman để xem dữ liệu giả (fake metrics)
- Config cơ bản của Websocket (đã test thử websocket như lỏd quá nên xóa)

Các file cơ bản:
- config/JacksonConfig.java: map Instant
- config/WebSocketConfig.java: sau này hoàn thành sau
- consumer/TrafficMetricsConsumer.java: consume từ Kafka 
- dto/TrafficMetricsDTO.java: CHuẩn hóa json được consume
- entity/TrafficMetric.java: ánh xạ tới bảng traffic_metric trong database, lấy dữ liệu từ đây để tạo endpoint
- repository/TrafficMetricRepository.java: DAO
- service/HeatmapService: phát triển sau
- service/SimulationService: fake data (random), gửi lên kafka (nhưng chỉ ở chế độ simulate (chỉnh trong properties và docker-compose.yml))
- web/TrafficController.java: tạo endpoints

Hướng dẫn chạy:
- cd backend/dashboard-service
- Tạo topic thủ công: docker exec -it broker /usr/bin/kafka-topics --create --bootstrap-server broker:29092 --replication-factor 1 --partitions 3 --topic traffic_metrics_topic
- build: docker compose build dashboard-service
- docker: docker compose up dashboard-service

Note: 
- Vì dashboard-service hiện tại chưa liên quan đến  ingestion và processing nên chạy độc lập sẽ dễ debug + quan sát hơn
- Khi simulate=false → hệ thống không gửi dữ liệu Kafka 
- Khi simulate=true → tạo dữ liệu 500 camera mỗi 15 giây, gửi Kafka (chỉnh trong properties và docker-compose.yml)