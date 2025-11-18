# Image Retrieval Service

This project is a Spring Boot application designed to retrieve the latest images from a MinIO bucket named "traffic-analyzed-images". 

## Project Structure

```
image-retrieval-service
├── src
│   ├── main
│   │   ├── java
│   │   │   └── com
│   │   │       └── traffic
│   │   │           └── imageretrieval
│   │   │               ├── ImageRetrievalApplication.java
│   │   │               ├── config
│   │   │               │   └── MinioConfig.java
│   │   │               ├── controller
│   │   │               │   └── ImageController.java
│   │   │               ├── service
│   │   │               │   ├── ImageService.java
│   │   │               │   └── MinioService.java
│   │   │               └── dto
│   │   │                   └── ImageResponse.java
│   │   └── resources
│   │       ├── application.yml
│   │       └── application-dev.yml
│   └── test
│       └── java
│           └── com
│               └── traffic
│                   └── imageretrieval
│                       └── ImageRetrievalApplicationTests.java
├── pom.xml
├── Dockerfile
└── README.md
```

## Setup Instructions

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd image-retrieval-service
   ```

2. **Build the project**:
   ```
   mvn clean install
   ```

3. **Run the application**:
   ```
   mvn spring-boot:run
   ```

4. **Access the API**:
   The application exposes a REST API to retrieve images. You can access it at:
   ```
   http://localhost:8080/images/latest
   ```

## Configuration

- The application connects to a MinIO instance. Ensure that the MinIO server is running and accessible.
- Update the `application.yml` file with the appropriate MinIO connection details.

## Testing

Unit tests are included in the project to verify the functionality of the application components. You can run the tests using:
```
mvn test
```

## Docker

To build and run the application in a Docker container, use the provided `Dockerfile`. Build the Docker image with:
```
docker build -t image-retrieval-service .
```

Run the Docker container with:
```
docker run -p 8080:8080 image-retrieval-service
```

## License

This project is licensed under the MIT License. See the LICENSE file for details.