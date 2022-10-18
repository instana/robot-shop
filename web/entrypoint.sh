#!/usr/bin/env bash

# set -x

# echo "arg 1 $1"

BASE_DIR=/usr/share/nginx/html

if [ -n "$1" ]
then
    exec "$@"
fi


echo "Copy empty file"
cp $BASE_DIR/empty.html $BASE_DIR/eum.html

# make sure nginx can access the eum file
chmod 644 $BASE_DIR/eum.html

# apply environment variables to default.conf
envsubst '${CATALOGUE_HOST} ${USER_HOST} ${CART_HOST} ${SHIPPING_HOST} ${PAYMENT_HOST} ${RATINGS_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf


exec nginx-debug -g "daemon off;"
