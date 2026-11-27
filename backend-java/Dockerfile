# Imagem do back-end (Spring Boot) para o Render.
# O Render não roda Java direto: ele monta esta imagem a partir do GitHub.

# Etapa 1: compila o projeto com o JDK 21 (mesmo comando do mvnw local)
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY src src
RUN chmod +x mvnw && ./mvnw -B -q package -DskipTests

# Etapa 2: só o necessário para rodar (imagem menor, sem o compilador)
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# O plano gratuito do Render tem 512 MB: limita a memória do Java para caber
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k"
# O Render informa a porta na variável PORT (application.properties: server.port)
EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
