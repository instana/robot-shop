#
# Build
#
FROM debian:10 AS build

RUN apt-get update && apt-get -y install maven

WORKDIR /opt/shipping

COPY pom.xml /opt/shipping/
RUN mvn dependency:resolve
COPY src /opt/shipping/src/
RUN mvn package

#
# Run
#
FROM openjdk:8-jdk

EXPOSE 8080

WORKDIR /opt/shipping

ENV CART_ENDPOINT=cart:8080
ENV DB_HOST=mysql
COPY opentelemetry-javaagent.jar /opt/shipping/

COPY --from=build /opt/shipping/target/shipping-1.0.jar shipping.jar

CMD [ "java", "-Xmn256m", "-Xmx768m", "-javaagent:opentelemetry-javaagent.jar", "-Dotel.resource.attributes=service.name=shipping","-Dotel.traces.exporter=jaeger","-Dotel.exporter.jaeger.endpoint=http://jaeger:14250","-jar", "shipping.jar" ]

