FROM nginx:1.17.6

RUN set -x \
  && apt-get update \
  && apt-get install --no-install-recommends --no-install-suggests -y \
              curl apt-transport-https iproute2 \
  && apt-get install --no-install-recommends --no-install-suggests -y \
              lynx curl ca-certificates gnupg2

ARG agent_key
ARG sensor_version

ENV NGINX_SENSOR_VERSION=${sensor_version}

# Download extension from Artifactory
RUN arti_path=https://artifact-public.instana.io/artifactory/shared/com/instana/libinstana_sensor/; \
    sensor_version=${NGINX_SENSOR_VERSION}; \
    curl --user _:${agent_key} --silent --output /usr/local/lib/libinstana_sensor.so ${arti_path}${sensor_version}/linux-amd64-libinstana_sensor.so && \
    curl --user _:${agent_key} --silent --output /usr/lib/nginx/modules/ngx_http_opentracing_module.so ${arti_path}${sensor_version}/linux-amd64-nginx-1.17.6-ngx_http_ot_module.so

COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY default.conf.template /etc/nginx/conf.d/default.conf.template

COPY entrypoint.sh /root/
ENTRYPOINT ["/root/entrypoint.sh"]
