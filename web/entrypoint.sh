#!/usr/bin/env bash

# set -x

# echo "arg 1 $1"

BASE_DIR=/usr/share/nginx/html

if [ -n "$1" ]
then
    exec "$@"
fi

if [ -n "$INSTANA_EUM_KEY" ]
then
    echo "Enabling Instana EUM"
    sed -e "/ineum/s/INSTANA_EUM_KEY/$INSTANA_EUM_KEY/" $BASE_DIR/eum-tmpl.html > $BASE_DIR/eum.html
else
    cp $BASE_DIR/empty.html $BASE_DIR/eum.html
fi

exec nginx -g "daemon off;"

