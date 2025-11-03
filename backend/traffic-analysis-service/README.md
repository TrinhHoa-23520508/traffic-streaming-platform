# Traffic Analysis Service

This project implements a traffic image analysis feature using YOLOv8 to count the number of vehicles in traffic images. The application fetches images from a Kafka topic, processes them, and publishes the results to another Kafka topic.



## Setup Instructions

1. dừng và xóa tất cả
   - docker-compose down

2. Build lại toàn bộ
   - docker-compose up --build

3. Test thông qua docker-desktop
   - vào container traffic-analysis-service
   - xem đã chạy thành công chưa, nếu thành công sẽ hiện các thông tin liên quan đến đường dẫn, tên camera, số lượng của từng loại xe, số lượng tổng hợp phương tiện

4. Test thông qua hình ảnh
   - vào trang localhost:9000
   - chọn buckets traffic-analyzed-images
   - vào từng folder chứa camera mún xem
   - nhấn vào file ảnh mún xem
   - ở bên phải có phần preview, nhấn preview để xem hình ảnh đã được phân tích và các objects được phân tích đã được đóng khung


## Usage

The application listens to the `hcm_traffic_data` Kafka topic for messages containing the `liveviewUrl` of traffic images. It constructs the full image URL by appending the prefix `https://api.notis.vn/v4/` to the `liveviewUrl`, fetches the images, and analyzes them using YOLOv8 to count the number of vehicles. The results are then published to the `traffic_metrics` Kafka topic.

## Dependencies

The project requires the following Python libraries, which are listed in `requirements.txt`:

- Kafka client for Python
- Image processing libraries
- YOLOv8 model library

## Contributing

Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.