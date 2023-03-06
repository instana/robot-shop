#!/usr/bin/env bash

# set -x

# echo "arg 1 $1"


BASE_DIR=/usr/share/nginx/html

if [ -n "$1" ]
then
    exec "$@"
fi

if [ -n "$INSTANA_EUM_KEY" -a -n "$INSTANA_EUM_REPORTING_URL" ]
then
    echo "Enabling Instana EUM"
    result=$(curl -kv -s --connect-timeout 10 "$INSTANA_EUM_REPORTING_URL" 2>&1 | grep "301 Moved Permanently")
    if [ -n "$result" ]; 
    then
        echo '301 Moved Permanently found!'
        [[ "${INSTANA_EUM_REPORTING_URL}" != */ ]] &&  INSTANA_EUM_REPORTING_URL="${INSTANA_EUM_REPORTING_URL}/"
        sed -i "s|INSTANA_EUM_KEY|$INSTANA_EUM_KEY|" $BASE_DIR/eum-tmpl.html
        sed -i "s|INSTANA_EUM_REPORTING_URL|$INSTANA_EUM_REPORTING_URL|" $BASE_DIR/eum-tmpl.html
        cp $BASE_DIR/eum-tmpl.html $BASE_DIR/eum.html
    else
        echo "Go with the user input"
        sed -i "s|INSTANA_EUM_KEY|$INSTANA_EUM_KEY|" $BASE_DIR/eum-tmpl.html
        sed -i "s|INSTANA_EUM_REPORTING_URL|$INSTANA_EUM_REPORTING_URL|" $BASE_DIR/eum-tmpl.html
        cp $BASE_DIR/eum-tmpl.html $BASE_DIR/eum.html
    fi

else
    echo "EUM not enabled"
    cp $BASE_DIR/empty.html $BASE_DIR/eum.html
fi

# make sure nginx can access the eum file
chmod 644 $BASE_DIR/eum.html

# apply environment variables to default.conf
envsubst '${CATALOGUE_HOST} ${USER_HOST} ${CART_HOST} ${SHIPPING_HOST} ${PAYMENT_HOST} ${RATINGS_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

if [ -f /tmp/ngx_http_opentracing_module.so -a -f /tmp/libinstana_sensor.so ]
then
    echo "Patching for Instana tracing"
    mv /tmp/ngx_http_opentracing_module.so /usr/lib/nginx/modules
    mv /tmp/libinstana_sensor.so /usr/local/lib
    cat - /etc/nginx/nginx.conf << !EOF! > /tmp/nginx.conf
# Extra configuration for Instana tracing
load_module modules/ngx_http_opentracing_module.so;

# Pass through these env vars
env INSTANA_SERVICE_NAME;
env INSTANA_AGENT_HOST;
env INSTANA_AGENT_PORT;
env INSTANA_MAX_BUFFERED_SPANS;
env INSTANA_DEV;
!EOF!

    mv /tmp/nginx.conf /etc/nginx/nginx.conf
    echo "{}" > /etc/instana-config.json
else
    echo "Tracing not enabled"
    # remove tracing config
    sed -i '1,3d' /etc/nginx/conf.d/default.conf
fi

exec nginx-debug -g "daemon off;"

