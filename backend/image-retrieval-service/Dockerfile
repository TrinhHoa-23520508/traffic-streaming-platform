# Stage 1: Build stage
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml và download dependencies trước
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code và build
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Tạo user non-root để chạy ứng dụng
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy jar file từ build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 1810

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:1810/actuator/health || exit 1
# Entry point
ENTRYPOINT ["java", \
            "-Djava.security.egd=file:/dev/./urandom", \
            "-XX:MaxRAMPercentage=75.0", \
            "-XX:+UseContainerSupport", \
            "-jar", \
            "app.jar"]