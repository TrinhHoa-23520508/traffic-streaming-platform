from kafka_client.producer import KafkaProducer
import requests
import json
import logging
from processing.image_fetcher import ImageFetcher
from processing.vehicle_counter import VehicleCounter
from models.yolo import YOLOModel
from config import KAFKA_BROKER, KAFKA_INPUT_TOPIC, KAFKA_OUTPUT_TOPIC, YOLO_MODEL_PATH, IMAGE_BASE_URL

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    logger.info("Khởi động Traffic Analysis Service")
    
    # Khởi tạo model YOLO
    logger.info(f"Tải model YOLO từ {YOLO_MODEL_PATH}")
    yolo_model = YOLOModel(YOLO_MODEL_PATH)
    
    # Sử dụng KafkaConsumer từ module kafka.consumer
    from kafka_client.consumer import KafkaConsumer
    consumer = KafkaConsumer(
        kafka_broker=KAFKA_BROKER,
        topic=KAFKA_INPUT_TOPIC
    )
    
    # Bắt đầu lắng nghe và xử lý
    consumer.consume_messages()

if __name__ == "__main__":
    main()