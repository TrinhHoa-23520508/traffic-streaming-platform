# ====== STAGE 1: Build bằng Maven ======
FROM eclipse-temurin:17-jdk AS build

# Cho phép native access để tránh cảnh báo trong Maven
ENV MAVEN_OPTS="--enable-native-access=ALL-UNNAMED"

# Cài Maven thủ công (nếu không có Maven Wrapper)
RUN apt-get update && apt-get install -y maven && rm -rf /var/lib/apt/lists/*

# Copy source code vào image
WORKDIR /app
COPY pom.xml .
COPY src ./src

# Build project (bỏ qua test)
RUN mvn clean package -DskipTests


# ====== STAGE 2: Image chạy thực tế ======
FROM eclipse-temurin:17-jre

# Install Liberation fonts for Vietnamese support + additional fonts
RUN apt-get update && \
    apt-get install -y \
    fonts-liberation \
    fonts-liberation2 \
    fonts-dejavu \
    fontconfig \
    && rm -rf /var/lib/apt/lists/* && \
    fc-cache -f -v

# Tạo thư mục ứng dụng
WORKDIR /app

# Copy file .jar từ stage build
COPY --from=build /app/target/dashboard-service-0.0.1.jar app.jar

# Cho phép native access khi chạy Spring Boot
ENV JAVA_OPTS="--enable-native-access=ALL-UNNAMED"

# Expose cổng mặc định của Spring Boot
EXPOSE 8080

# Lệnh chạy ứng dụng
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]