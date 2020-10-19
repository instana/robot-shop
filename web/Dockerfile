FROM nginx:1.19

EXPOSE 8080

RUN echo "js_path /opt/nginx_js;" > /etc/nginx/conf.d/njs.conf
RUN echo "\njs_import instana_random_geo.js;\n" >> /etc/nginx/conf.d/njs.conf
RUN echo "\njs_set \$fake_ip instana_random_geo;\n" >> /etc/nginx/conf.d/njs.conf
RUN sed -i '1i load_module \"modules/ngx_http_js_module.so\";' /etc/nginx/nginx.conf
RUN sed -i '1i load_module \"modules/ngx_stream_js_module.so\";' /etc/nginx/nginx.conf
RUN apt update -yqq && apt install nginx-module-njs -y
RUN mkdir -p /opt/nginx_js
COPY instana_random_geo.js /opt/nginx_js/instana_random_geo.js

ENV CATALOGUE_HOST=catalogue \
    USER_HOST=user \
    CART_HOST=cart \
    SHIPPING_HOST=shipping \
    PAYMENT_HOST=payment \
    RATINGS_HOST=ratings

COPY entrypoint.sh /root/
ENTRYPOINT ["/root/entrypoint.sh"]

COPY default.conf.template /etc/nginx/conf.d/default.conf.template
COPY static /usr/share/nginx/html
