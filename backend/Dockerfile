FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml ./
COPY src/main ./src/main
RUN mvn --batch-mode --no-transfer-progress -Dmaven.test.skip=true package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN groupadd --system pinmate \
    && useradd --system --gid pinmate --home-dir /app --shell /usr/sbin/nologin pinmate
COPY --from=build --chown=pinmate:pinmate /app/target/pinmate-0.0.1-SNAPSHOT.jar ./app.jar
USER pinmate:pinmate
ENV SPRING_PROFILES_ACTIVE=prod
ENV JAVA_TOOL_OPTIONS="-Xms64m -Xmx256m"
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "app.jar"]
