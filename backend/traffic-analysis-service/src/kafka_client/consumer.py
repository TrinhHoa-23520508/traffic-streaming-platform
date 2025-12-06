import json
import logging
import time
import cv2
import numpy as np
import threading
from queue import Queue, Empty
from concurrent.futures import ThreadPoolExecutor

from kafka import KafkaConsumer as KafkaPyConsumer
from kafka import KafkaProducer as KafkaPyProducer
from utils.time_utils import timestamp_to_vietnam_time
from utils.minio_client import MinioClient
from config import (
    MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET_NAME,
    YOLO_MODEL_PATH, IMAGE_BASE_URL,
    BATCH_SIZE, BATCH_TIMEOUT, DOWNLOAD_WORKERS, UPLOAD_WORKERS
)

logger = logging.getLogger(__name__)

class TrafficAnalysisService:
    def __init__(self, kafka_broker, input_topic, output_topic):
        # 1. Khởi tạo Kafka Consumer (Consumer Group)
        self.consumer = KafkaPyConsumer(
            input_topic,
            bootstrap_servers=kafka_broker,
            auto_offset_reset='latest',
            enable_auto_commit=True,
            group_id='traffic-analysis-group', 
            value_deserializer=lambda x: json.loads(x.decode('utf-8')),
            max_poll_records=10,
            max_poll_interval_ms=300000 # 5 phút
        )
        
        # 2. Khởi tạo Kafka Producer
        self.producer = KafkaPyProducer(
            bootstrap_servers=kafka_broker,
            value_serializer=lambda x: json.dumps(x).encode('utf-8')
        )

        # 3. Khởi tạo MinIO & Model
        self.minio_client = MinioClient(MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET_NAME)
        
        from models.yolo import YOLOModel
        from processing.image_fetcher import ImageFetcher
        from processing.vehicle_counter import VehicleCounter
        
        logger.info(f"Loading Model Batch Size: {BATCH_SIZE}...")
        self.yolo_model = YOLOModel(YOLO_MODEL_PATH)
        self.image_fetcher = ImageFetcher(IMAGE_BASE_URL)
        self.output_topic = output_topic

        # 4. Các hàng đợi (Queues) cho Pipeline
        self.inference_queue = Queue(maxsize=BATCH_SIZE * 4) 
        self.upload_queue = Queue(maxsize=BATCH_SIZE * 4)    
        
        # 5. Thread Pools
        self.download_pool = ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS)
        self.upload_pool = ThreadPoolExecutor(max_workers=UPLOAD_WORKERS)
        
        self.is_running = True

    def start(self):
        logger.info("Starting Traffic Analysis Service")
        
        kafka_thread = threading.Thread(target=self.consume_loop)
        kafka_thread.daemon = True
        kafka_thread.start()

        gpu_thread = threading.Thread(target=self.gpu_inference_loop)
        gpu_thread.daemon = True
        gpu_thread.start()

        result_thread = threading.Thread(target=self.result_processing_loop)
        result_thread.daemon = True
        result_thread.start()

        try:
            while True: time.sleep(1)
        except KeyboardInterrupt:
            self.is_running = False
            logger.info("Stopping service...")

    def consume_loop(self):
        """Luồng đọc Kafka và submit task tải ảnh"""
        logger.info(f"Listening on Kafka with {DOWNLOAD_WORKERS} download threads...")
        for message in self.consumer:
            if not self.is_running: break
            
            camera_data = message.value
            camera_id = camera_data.get('id', '')

            if not camera_id.startswith("BD"):
                continue

            self.download_pool.submit(self.download_task, camera_data)

    def download_task(self, camera_data):
        """Task tải ảnh và decode (Chạy đa luồng)"""
        try:
            liveview_url = camera_data.get('liveviewUrl')
            if not liveview_url: return

            image_bytes = self.image_fetcher.fetch_image(liveview_url)
            
            if image_bytes:
                nparr = np.frombuffer(image_bytes, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                
                if image is not None:
                    self.inference_queue.put((image, camera_data))
        except Exception as e:
            logger.error(f"Download error: {e}")

    def gpu_inference_loop(self):
        """Luồng GPU: Gom batch và chạy YOLO"""
        logger.info(f" GPU Batch Processing Started (Batch Size: {BATCH_SIZE})")
        
        batch_images = []
        batch_metadata = []
        last_batch_time = time.time()

        while self.is_running:
            try:
                # Lấy ảnh từ hàng đợi
                # timeout ngắn để check logic thời gian
                item = self.inference_queue.get(timeout=0.05)
                batch_images.append(item[0])
                batch_metadata.append(item[1])
            except Empty:
                pass

            # Điều kiện chạy Batch:
            # 1. Đủ số lượng (BATCH_SIZE)
            # 2. HOẶC Đã đợi quá lâu (BATCH_TIMEOUT) và có ít nhất 1 ảnh
            current_time = time.time()
            is_batch_full = len(batch_images) >= BATCH_SIZE
            is_timeout = (current_time - last_batch_time >= BATCH_TIMEOUT) and len(batch_images) > 0

            if is_batch_full or is_timeout:
                try:
                    # --- CHẠY INFERENCE ---
                    # Đưa cả list ảnh vào model 1 lần
                    results = self.yolo_model.analyze_image(batch_images)
                    
                    # Ghép kết quả lại với metadata
                    for i, result in enumerate(results):
                        meta = batch_metadata[i]
                        original_img = batch_images[i]
                        
                        # Đẩy sang hàng đợi xử lý kết quả
                        self.upload_queue.put((result, meta, original_img))
                    
                except Exception as e:
                    logger.error(f"Inference Batch Error: {e}")
                finally:
                    # Reset batch
                    batch_images = []
                    batch_metadata = []
                    last_batch_time = time.time()

    def result_processing_loop(self):
        """Luồng lấy kết quả từ GPU -> Submit task upload"""
        logger.info(f"📤 Result processing started with {UPLOAD_WORKERS} upload threads...")
        while self.is_running:
            try:
                item = self.upload_queue.get(timeout=1)
                # item: (yolo_result, metadata, original_image_numpy)
                
                # Submit task upload vào ThreadPool
                self.upload_pool.submit(self.upload_and_publish_task, item)
            except Empty:
                continue

    def upload_and_publish_task(self, item):
        """Task vẽ ảnh, upload MinIO và bắn Kafka"""
        try:
            yolo_result, camera_data, image = item
            
            # 1. Đếm đối tượng
            count_result = self.yolo_model.count_objects([yolo_result]) # Hàm này cần chỉnh nhẹ để nhận list hoặc 1 item
            
            # 2. Vẽ ảnh (Chỉ vẽ nếu cần lưu - Tối ưu CPU)
            # annotated_image = yolo_result.plot()
            
            # 3. Upload MinIO 
            annotated_image_url = None
            
            # Uncomment dòng dưới nếu muốn upload ảnh
            annotated_image = yolo_result.plot()
            _, buffer = cv2.imencode('.jpg', annotated_image)
            image_bytes = buffer.tobytes()
            annotated_image_url = self.minio_client.upload_image(
                 image_bytes,
                 camera_data.get('id'),
                 camera_data.get('timestamp')
            )

            # 4. Gửi Kafka Output
            self.publish_results(camera_data, count_result, annotated_image_url)

        except Exception as e:
            logger.error(f"Post-processing error: {e}")

    def publish_results(self, camera_data, count_result, annotated_image_url):
        # ... (Copy logic từ publish_results cũ vào đây)
        try:
            timestamp = camera_data.get('timestamp')
            vietnam_time = timestamp_to_vietnam_time(timestamp) if timestamp else None
            
            result = {
                'camera_id': camera_data.get('id'),
                'camera_name': camera_data.get('name'),
                'district': camera_data.get('dist'),
                'liveview_url': camera_data.get('liveviewUrl'),
                'coordinates': camera_data.get('loc', {}).get('coordinates', []),
                'total_count': count_result['total'],
                'detection_details': count_result['details'],
                'timestamp': timestamp,
                'timestamp_vn': vietnam_time,
                'annotated_image_url': annotated_image_url
            }
            
            self.producer.send(self.output_topic, result)
            # self.producer.flush() 
            
        except Exception as e:
            logger.error(f"Kafka publish error: {e}")