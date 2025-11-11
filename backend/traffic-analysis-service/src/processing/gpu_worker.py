# gpu_worker.py
"""
GPUWorker: tiến trình chạy YOLO duy nhất (GPU-bound)
 - Nhận ảnh từ hàng đợi
 - Chạy YOLO inference
 - Đếm phương tiện
 - Vẽ bounding box + upload MinIO
 - Gửi kết quả sang Kafka output topic
"""

import cv2
import numpy as np
import time
import logging
from processing.vehicle_counter import VehicleCounter
from utils.time_utils import timestamp_to_vietnam_time

logger = logging.getLogger(__name__)

class GPUWorker:
    def __init__(self, yolo_model, producer, minio_client):
        self.yolo_model = yolo_model
        self.producer = producer
        self.minio_client = minio_client

    def run(self, inference_queue):
        logger.info("🧠 GPU Worker khởi động — sẵn sàng nhận ảnh để xử lý YOLO.")
        while True:
            try:
                task = inference_queue.get()
                if task is None:
                    continue

                camera_data = task["camera_data"]
                image_bytes = task["image_bytes"]
                camera_id = camera_data.get("id", "unknown")

                start = time.time()

                # 1️⃣ Giải mã ảnh
                nparr = np.frombuffer(image_bytes, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                if image is None:
                    logger.warning(f"[GPU] Không giải mã được ảnh {camera_id}")
                    continue

                # Resize nhỏ lại để tăng tốc (ví dụ 640x360)
                image = cv2.resize(image, (640, 360))

                # 2️⃣ Chạy YOLO
                results = self.yolo_model.analyze_image(image)

                # 3️⃣ Đếm đối tượng
                count_result = VehicleCounter.count_from_results(results)

                # 4️⃣ Tạo ảnh annotated
                annotated = results[0].plot()
                _, buffer = cv2.imencode(".jpg", annotated)
                annotated_bytes = buffer.tobytes()

                # 5️⃣ Upload MinIO
                annotated_url = self.minio_client.upload_image(
                    annotated_bytes,
                    camera_id,
                    camera_data.get("timestamp")
                )

                # 6️⃣ Gửi kết quả qua Kafka output topic
                result = {
                    "camera_id": camera_id,
                    "camera_name": camera_data.get("name"),
                    "district": camera_data.get("dist"),
                    "timestamp": camera_data.get("timestamp"),
                    "timestamp_vn": timestamp_to_vietnam_time(camera_data.get("timestamp")),
                    "total_count": count_result["total"],
                    "detection_details": count_result["details"],
                    "annotated_image_url": annotated_url,
                }

                self.producer.send("traffic_metrics_topic", result)
                # ❌ KHÔNG flush() để tránh delay

                logger.info(f"[GPU] ✅ {camera_id} xử lý xong ({time.time()-start:.2f}s, total={count_result['total']})")

            except Exception as e:
                logger.error(f"[GPU] Lỗi khi xử lý ảnh: {e}")
