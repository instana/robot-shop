FROM nginx:1.13.8

EXPOSE 8080

# RUN apt-get update -y && apt-get install -y curl iputils-ping dnsutils
# RUN mkdir -p /var/cache/nginx && chmod 777 /var/cache/nginx

COPY default.conf /etc/nginx/conf.d/default.conf
COPY static /usr/share/nginx/html

