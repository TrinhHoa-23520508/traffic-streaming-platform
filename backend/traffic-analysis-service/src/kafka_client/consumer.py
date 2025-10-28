import json
import logging
import time
import cv2
import numpy as np
from kafka import KafkaConsumer as KafkaPyConsumer
from kafka import KafkaProducer as KafkaPyProducer
from utils.time_utils import timestamp_to_vietnam_time
from utils.minio_client import MinioClient
from config import MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET_NAME

logger = logging.getLogger(__name__)

class KafkaConsumer:
    def __init__(self, kafka_broker, topic):
        # Thêm retry logic để kết nối Kafka
        max_retries = 10
        retry_interval = 5  # seconds
        
        for i in range(max_retries):
            try:
                logger.info(f"Thử kết nối đến Kafka broker {kafka_broker} (lần {i+1}/{max_retries})")
                self.consumer = KafkaPyConsumer(
                    topic,
                    bootstrap_servers=kafka_broker,
                    auto_offset_reset='earliest',
                    enable_auto_commit=True,
                    group_id='traffic-analysis-group',
                    value_deserializer=lambda x: json.loads(x.decode('utf-8')),
                    session_timeout_ms=10000,
                    request_timeout_ms=15000
                )
                logger.info(f"Kết nối thành công đến Kafka broker {kafka_broker}")
                break
            except Exception as e:
                if i < max_retries - 1:
                    logger.warning(f"Không thể kết nối đến Kafka broker: {str(e)}. Thử lại sau {retry_interval} giây.")
                    time.sleep(retry_interval)
                else:
                    logger.error(f"Không thể kết nối đến Kafka sau {max_retries} lần thử. Lỗi: {str(e)}")
                    raise
        
        # Khởi tạo producer
        self.producer = KafkaPyProducer(
            bootstrap_servers=kafka_broker,
            value_serializer=lambda x: json.dumps(x).encode('utf-8')
        )
        
        # Khởi tạo MinIO client
        self.minio_client = MinioClient(
            MINIO_ENDPOINT,
            MINIO_ACCESS_KEY,
            MINIO_SECRET_KEY,
            MINIO_BUCKET_NAME
        )
        
        # Khởi tạo YOLO model và các thành phần xử lý
        from models.yolo import YOLOModel
        from processing.image_fetcher import ImageFetcher
        from processing.vehicle_counter import VehicleCounter
        from config import YOLO_MODEL_PATH, IMAGE_BASE_URL
        
        logger.info("Khởi tạo YOLO model và các thành phần xử lý...")
        self.yolo_model = YOLOModel(YOLO_MODEL_PATH)
        self.image_fetcher = ImageFetcher(IMAGE_BASE_URL)
        self.vehicle_counter = VehicleCounter(self.yolo_model)
        
        logger.info("Khởi tạo consumer hoàn tất, sẵn sàng xử lý TOÀN BỘ camera")

    def consume_messages(self):
        logger.info("Bắt đầu lắng nghe dữ liệu từ TẤT CẢ camera")
        
        for message in self.consumer:
            try:
                camera_data = message.value
                camera_id = camera_data.get('id', 'Unknown')
                camera_name = camera_data.get('name', 'Unknown')
                
                logger.info(f"Nhận dữ liệu từ camera: {camera_name} (ID: {camera_id})")
                self.process_message(camera_data)
                
            except Exception as e:
                logger.error(f"Lỗi khi xử lý message: {str(e)}")
                import traceback
                traceback.print_exc()

    def process_message(self, camera_data):
        liveview_url = camera_data.get('liveviewUrl')
        camera_id = camera_data.get('id')
        
        if not liveview_url:
            logger.warning(f"Không tìm thấy liveviewUrl cho camera {camera_id}")
            return
        
        try:
            logger.info(f"Xử lý ảnh từ camera {camera_id}: {liveview_url}")
            
            # Tải ảnh
            image_bytes = self.image_fetcher.fetch_image(liveview_url)
            
            if image_bytes:
                # Chuyển đổi bytes thành numpy array
                nparr = np.frombuffer(image_bytes, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if image is None:
                    logger.warning(f"Không thể giải mã ảnh từ camera {camera_id}")
                    return
                
                # Đếm tất cả đối tượng (phương tiện + người + xe đạp)
                count_result = self.vehicle_counter.count_vehicles(image_bytes)
                
                # Tạo hình ảnh đã phân tích với bounding boxes
                annotated_image_bytes = self.create_annotated_image(image)
                
                # Upload lên MinIO
                annotated_image_url = None
                if annotated_image_bytes:
                    annotated_image_url = self.minio_client.upload_image(
                        annotated_image_bytes,
                        camera_id,
                        camera_data.get('timestamp')
                    )
                
                # Gửi kết quả
                self.publish_results(camera_data, count_result, annotated_image_url)
            else:
                logger.warning(f"Không thể tải ảnh từ {liveview_url}")
                
        except Exception as e:
            logger.error(f"Lỗi khi xử lý ảnh từ camera {camera_id}: {str(e)}")
            import traceback
            traceback.print_exc()

    def create_annotated_image(self, image):
        """
        Tạo hình ảnh đã được đánh dấu với bounding boxes
        """
        try:
            # Phân tích hình ảnh với YOLO
            results = self.yolo_model.analyze_image(image)
            
            # Vẽ bounding boxes và labels lên hình ảnh
            annotated_image = results[0].plot()
            
            # Chuyển về bytes
            _, buffer = cv2.imencode('.jpg', annotated_image)
            
            logger.info("Đã tạo hình ảnh phân tích với bounding boxes")
            return buffer.tobytes()
            
        except Exception as e:
            logger.error(f"Lỗi khi tạo hình ảnh phân tích: {str(e)}")
            return None

    def publish_results(self, camera_data, count_result, annotated_image_url):
        try:
            timestamp = camera_data.get('timestamp')
            vietnam_time = timestamp_to_vietnam_time(timestamp) if timestamp else None
            
            # Tạo kết quả với thông tin chi tiết
            result = {
                'camera_id': camera_data.get('id'),
                'camera_name': camera_data.get('name'),
                'district': camera_data.get('dist'),
                'liveview_url': camera_data.get('liveviewUrl'),
                'coordinates': camera_data.get('loc', {}).get('coordinates', []),
                'total_count': count_result['total'],  # Tổng số đối tượng
                'detection_details': count_result['details'],  # Chi tiết từng loại
                'timestamp': timestamp,
                'timestamp_vn': vietnam_time,
                'annotated_image_url': annotated_image_url
            }
            
            # Gửi kết quả lên Kafka
            self.producer.send('traffic_metrics', result)
            self.producer.flush()
            
            logger.info(f"Đã gửi kết quả phân tích cho camera {camera_data.get('name')}:")
            logger.info(f"  - Tổng số đối tượng: {count_result['total']}")
            logger.info(f"  - Chi tiết: {count_result['details']}")
            logger.info(f"  - Thời gian: {vietnam_time}")
            if annotated_image_url:
                logger.info(f"  - URL ảnh: {annotated_image_url}")
            
        except Exception as e:
            logger.error(f"Lỗi khi gửi kết quả: {str(e)}")
            import traceback
            traceback.print_exc()