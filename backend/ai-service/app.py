from flask import Flask, request, jsonify
import random
import logging

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)

@app.route('/analyze', methods=['POST'])
def analyze_image():
    data = request.get_json()
    image_url = data.get('image_url', 'No URL provided')
    
    app.logger.info(f"Received request to analyze image: {image_url}")

    total_vehicles = random.randint(5, 100)
  
    car_count = random.randint(0, total_vehicles)
    
    motorcycle_count = total_vehicles - car_count

    response_data = {
        "image_name": image_url.split("/")[-1],
        "total_vehicles": total_vehicles,
        "vehicle_counts": {
            "car": car_count,
            "motorcycle": motorcycle_count,
            "bus": 0,  
            "truck": 0 
        }
    }
    
    app.logger.info(f"Mock analysis result: {response_data}")
    
    return jsonify(response_data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)