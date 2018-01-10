#
# Build
#
FROM openjdk:8-jdk as build

RUN apt-get update && apt-get -y install maven

WORKDIR /opt/shipping

COPY pom.xml /opt/shipping/
RUN mvn install

COPY src /opt/shipping/src/
RUN mvn package

#
# Run
#
FROM openjdk:8-jdk

EXPOSE 8080

WORKDIR /opt/shipping

COPY --from=build /opt/shipping/target/shipping-1.0-jar-with-dependencies.jar shipping.jar

CMD [ "java", "-jar", "shipping.jar" ]

