# Image Storage Service

## Overview
The Image Storage Service is a Spring Boot application designed to consume traffic camera data from a Kafka topic, process the incoming data, and store associated images in a MinIO storage service. The application listens for JSON messages that represent camera data, extracts image URLs, and downloads the images for storage.

## Features
- Consumes camera data from a Kafka topic.
- Downloads images from URLs provided in the camera data.
- Stores images in a MinIO object storage service.
- Configurable Kafka and MinIO settings.

## Project Structure
```
image-storage-service
├── src
│   ├── main
│   │   ├── java
│   │   │   └── com
│   │   │       └── traffic_stream
│   │   │           └── image_storage
│   │   │               ├── ImageStorageServiceApplication.java
│   │   │               ├── config
│   │   │               │   ├── KafkaConsumerConfig.java
│   │   │               │   └── MinioConfig.java
│   │   │               ├── dto
│   │   │               │   └── CameraRawDTO.java
│   │   │               ├── service
│   │   │               │   ├── ImageService.java
│   │   │               │   ├── KafkaConsumerService.java
│   │   │               │   └── MinioService.java
│   │   │               └── util
│   │   │                   └── ImageDownloader.java
│   │   └── resources
│   │       └── application.properties
│   └── test
│       └── java
│           └── com
│               └── traffic_stream
│                   └── image_storage
│                       └── ImageStorageServiceApplicationTests.java
├── .gitignore
├── pom.xml
└── README.md
```

## Setup Instructions
1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd image-storage-service
   ```

2. **Build the project:**
   ```
   mvn clean install
   ```

3. **Configure application properties:**
   Update the `src/main/resources/application.properties` file with your Kafka and MinIO configurations.

4. **Run the application:**
   ```
   mvn spring-boot:run
   ```

## Usage
- The application will start consuming messages from the configured Kafka topic.
- It will download images from the URLs specified in the incoming camera data and store them in the configured MinIO bucket.

## Dependencies
- Spring Boot
- Spring Kafka
- MinIO Java SDK
- SLF4J for logging

## License
This project is licensed under the MIT License. See the LICENSE file for details.