import logging
from kafka_client.consumer import TrafficAnalysisService # Import class mới
from config import KAFKA_BROKER, KAFKA_INPUT_TOPIC, KAFKA_OUTPUT_TOPIC

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def main():
    service = TrafficAnalysisService(
        kafka_broker=KAFKA_BROKER,
        input_topic=KAFKA_INPUT_TOPIC,
        output_topic=KAFKA_OUTPUT_TOPIC
    )
    service.start()

if __name__ == "__main__":
    main()