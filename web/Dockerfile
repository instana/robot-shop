FROM alpine AS build
ARG KEY

WORKDIR /instana

RUN apk add --update --no-cache curl

ENV ARTI_PATH='https://artifact-public.instana.io/artifactory/shared/com/instana/nginx_tracing/'

RUN if [ -n "$KEY" ]; then \
    sensor_version=$(curl --user "_:$KEY" ${ARTI_PATH} | grep -o '>[0-9]\+\.[0-9]\+\.[0-9]\+'| cut -f 2 -d '>'|sort -V|tail -1 ); \
    echo "Downloading sensor version ${sensor_version} for Nginx version 1.21.6" ; \
    curl \
    --output instana.zip \
    --user "_:$KEY" \
    ${ARTI_PATH}/${sensor_version}/linux-amd64-glibc-nginx-1.21.6.zip && \
    unzip instana.zip && \
    mv glibc-libinstana_sensor.so libinstana_sensor.so && \
    mv glibc-nginx-1.21.6-ngx_http_ot_module.so ngx_http_opentracing_module.so; \
    else echo "KEY not provided. Not adding tracing"; \
    touch dummy.so; \
    fi


FROM nginx:1.21.6

EXPOSE 8080

ENV CATALOGUE_HOST=catalogue \
    USER_HOST=user \
    CART_HOST=cart \
    SHIPPING_HOST=shipping \
    PAYMENT_HOST=payment \
    RATINGS_HOST=ratings \
    INSTANA_SERVICE_NAME=nginx-web

# Instana tracing
COPY --from=build /instana/*.so /tmp/

COPY entrypoint.sh /root/
ENTRYPOINT ["/root/entrypoint.sh"]

COPY default.conf.template /etc/nginx/conf.d/default.conf.template
COPY static /usr/share/nginx/html
