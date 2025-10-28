class KafkaProducer:
    def __init__(self, kafka_broker, topic):
        from kafka import KafkaProducer as KafkaProducerLib
        self.producer = KafkaProducerLib(bootstrap_servers=kafka_broker)
        self.topic = topic

    def publish(self, message):
        self.producer.send(self.topic, value=message)
        self.producer.flush()

    def close(self):
        self.producer.close()