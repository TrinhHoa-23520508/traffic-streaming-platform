import os

# Kafka configuration
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'broker:29092')
KAFKA_INPUT_TOPIC = 'hcm_traffic_data'
KAFKA_OUTPUT_TOPIC = 'traffic_metrics'

# YOLO configuration - CHUYỂN SANG YOLOv11
YOLO_MODEL_PATH = '/app/models/yolo11n.pt'  # YOLOv11 nano (nhẹ nhất)
# Các phiên bản khác:
# yolo11s.pt - small (cân bằng)
# yolo11m.pt - medium (chính xác hơn)
# yolo11l.pt - large (rất chính xác)
# yolo11x.pt - extra large (chính xác nhất nhưng chậm)

# Image fetching configuration
IMAGE_BASE_URL = os.getenv('IMAGE_BASE_URL', 'https://api.notis.vn/v4/')
IMAGE_FETCH_TIMEOUT = 10

# Logging configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# MinIO configuration
MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', 'minio:9000')
MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
MINIO_BUCKET_NAME = os.getenv('MINIO_BUCKET_NAME', 'traffic-analyzed-images')