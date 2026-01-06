import threading
import json
import logging
import os
from fastapi import FastAPI, HTTPException
from kafka import KafkaConsumer
from src.services.routing_service import RoutingService
from typing import List

# Configuration
KAFKA_BROKER = os.getenv('KAFKA_BROKER', 'broker:29092')
KAFKA_TOPIC = 'traffic_metrics_topic'
ROUTING_PLACE = os.getenv('ROUTING_PLACE')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="Traffic Routing Service")

# Setup CORS
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Service
routing_service = None

@app.on_event("startup")
def startup_event():
    # Start service initialization in a separate thread to not block FastAPI startup
    init_thread = threading.Thread(target=init_service, daemon=True)
    init_thread.start()

def init_service():
    global routing_service
    logger.info("Initializing Routing Service...")
    try:
        routing_service = RoutingService(ROUTING_PLACE)
        logger.info("Routing Service initialized successfully.")
        
        # Start Kafka Consumer only after service is ready
        consume_traffic_data()
    except Exception as e:
        logger.error(f"Failed to initialize Routing Service: {e}")

def consume_traffic_data():
    if not routing_service:
        logger.warning("Routing service not ready, skipping Kafka consumer start.")
        return

    logger.info(f"Connecting to Kafka: {KAFKA_BROKER} Topic: {KAFKA_TOPIC}")
    try:
        consumer = KafkaConsumer(
            KAFKA_TOPIC,
            bootstrap_servers=KAFKA_BROKER,
            # auto_offset_reset='latest' ensures we only process new real-time data
            auto_offset_reset='latest',
            enable_auto_commit=True,
            group_id='routing-service-group',
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        
        logger.info("Kafka Consumer started successfully.")
        
        for message in consumer:
            try:
                data = message.value
                # Data format: { ..., coordinates: [lon, lat], total_count: int, ... }
                # NOTE: GeoJSON usually is [lon, lat]. Verify your source consistency.
                coords = data.get('coordinates')
                count = data.get('total_count', 0)
                
                if coords and len(coords) == 2:
                    lon, lat = coords[0], coords[1]
                    if routing_service:
                        routing_service.update_traffic(lat, lon, count)
            except Exception as e:
                logger.error(f"Error processing message: {e}")
                
    except Exception as e:
        logger.error(f"Kafka Consumer Connection Error: {e}")
        # In production, implement retry logic here

@app.get("/route")
def get_best_route(start_lat: float, start_lon: float, end_lat: float, end_lon: float):
    if not routing_service:
        raise HTTPException(status_code=503, detail="Service is initializing")
    
    result = routing_service.get_shortest_path(start_lat, start_lon, end_lat, end_lon)
    
    if not result:
        raise HTTPException(status_code=404, detail="No path found between these points")
        
    # Format response to mimic OSRM for frontend compatibility
    return {
        "code": "Ok",
        "routes": [
            {
                "geometry": {
                    "coordinates": result["coordinates"],
                    "type": "LineString"
                },
                "distance": result["distance"],
                "duration": result["duration"]
            }
        ]
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "graph_loaded": routing_service.graph is not None if routing_service else False}
