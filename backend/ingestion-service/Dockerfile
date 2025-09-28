FROM maven:3.9.6-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:21-jdk-jammy
WORKDIR /app
COPY --from=builder /app/target/ingestion-service-0.0.1-SNAPSHOT.jar app.jar

ENV KAFKA_BOOTSTRAP_SERVERS=broker:29092
ENV SPRING_PROFILES_ACTIVE=docker

EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
