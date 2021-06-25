FROM alpine AS build
ARG KEY

WORKDIR /instana

RUN apk add --update --no-cache curl

RUN if [ -n "$KEY" ]; then curl \
    --output instana.zip \
    --user "_:$KEY" \
    https://artifact-public.instana.io/artifactory/shared/com/instana/nginx_tracing/1.1.2/linux-amd64-glibc-nginx-1.20.1.zip && \
    unzip instana.zip && \
    mv glibc-libinstana_sensor.so libinstana_sensor.so && \
    mv glibc-nginx-1.20.1-ngx_http_ot_module.so ngx_http_opentracing_module.so; \
    else echo "KEY not provided. Not adding tracing"; \
    touch dummy.so; \
    fi


FROM nginx:1.20.1

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
