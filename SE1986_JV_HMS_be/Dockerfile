# Build: cd SE1986_JV_HMS_be && docker build -t hms-be .
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Nghe mọi địa chỉ trong container; Render truyền cổng qua biến PORT.
ENV SERVER_ADDRESS=0.0.0.0
# Render Free chỉ có 512 MB RAM.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
