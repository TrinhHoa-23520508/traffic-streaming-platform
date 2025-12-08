import os


KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'broker:29092')
KAFKA_INPUT_TOPIC = 'hcm_traffic_data'
KAFKA_OUTPUT_TOPIC = 'traffic_metrics_topic'

YOLO_MODEL_PATH = '/app/models/yolo11n.pt' 


# Image fetching configuration
IMAGE_BASE_URL = os.getenv('IMAGE_BASE_URL', 'https://api.notis.vn/v4/')
IMAGE_FETCH_TIMEOUT = 10


LOG_LEVEL = os.getenv('LOG_LEVEL', 'WARNING')

# MinIO configuration
MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT', 'minio:9000')
MINIO_ACCESS_KEY = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
MINIO_SECRET_KEY = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
MINIO_BUCKET_NAME = os.getenv('MINIO_BUCKET_NAME', 'traffic-analyzed-images')

BATCH_SIZE = int(os.getenv('BATCH_SIZE', '32'))  
BATCH_TIMEOUT = 0.1  
DOWNLOAD_WORKERS = int(os.getenv('DOWNLOAD_WORKERS', '4')) 
UPLOAD_WORKERS = int(os.getenv('UPLOAD_WORKERS', '4')) 