 🚦 Real-time Traffic Image Processing Pipeline 

🔄 Cách hoạt động
#        Luồng dữ liệu 
1. Thu nhận dữ liệu
- Service nhận JSON từ Kafka topic chứa thông tin camera giao thông và URLs hình ảnh.
2. Xử lý dữ liệu
- Parse JSON thành đối tượng CameraRawDTO.
3. Tải hình ảnh
- Sử dụng ImageStreamProvider để tải hình ảnh từ URLs.
4. Lưu trữ
- Hình ảnh được lưu vào MinIO storage với tên file duy nhất.

#        Kiến trúc thành phần
1. Kafka Consumer
   Thành phần: KafkaConsumerService, KafkaConsumerConfig.
   Chức năng:
      - Cấu hình kết nối đến Kafka broker.
      - Đăng ký lắng nghe topic chứa dữ liệu camera.
      - Xử lý messages theo batch hoặc từng message.
      - Chuyển tiếp dữ liệu đến ImageService.
2. Image Processing  
   Thành phần: ImageService, ImageStreamProvider.
   Chức năng:
      - Trích xuất URLs hình ảnh từ dữ liệu camera.
      - Tải hình ảnh từ URLs.
      - Sinh metadata cho hình ảnh: timestamp, camera_id, location
      - Chuyển dữ liệu đến MinioService để lưu trữ.
3. Storage Management
  Thành phần: MinioService, MinioConfig.
   Chức năng:
      - Kết nối đến MinIO server.
      - Kiểm tra/tạo bucket nếu chưa tồn tại.
      - Lưu trữ hình ảnh với đường dẫn chuẩn hóa: YYYY/MM/DD/camera-id/timestamp.jpg
      - Quản lý metadata hình ảnh (JSON hoặc database).