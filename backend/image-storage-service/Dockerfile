# Build stage
FROM maven:3.8.6-openjdk-11-slim AS build
WORKDIR /app
# Copy pom.xml đầu tiên để tận dụng Docker cache
COPY pom.xml .
# Tải các dependencies
RUN mvn dependency:go-offline
# Copy source code
COPY src ./src
# Build project
RUN mvn package -DskipTests

# Run stage
FROM openjdk:11-jre-slim
WORKDIR /app
# Copy JAR từ build stage
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]