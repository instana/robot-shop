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
    TMP_FILE=$(mktemp)
    sed -e "/ineum/s/INSTANA_EUM_KEY/$INSTANA_EUM_KEY/" $BASE_DIR/eum-tmpl.html > $TMP_FILE
    if [ -n "$INSTANA_EUM_REPORTING_URL" ]
    then
        echo "Setting reporting url $INSTANA_EUM_REPORTING_URL"
        sed -e "/<\/script>/ i ineum('reportingUrl', '$INSTANA_EUM_REPORTING_URL');" $TMP_FILE > $BASE_DIR/eum.html
    else
        cp $TMP_FILE $BASE_DIR/eum.html
    fi

    rm $TMP_FILE
else
    cp $BASE_DIR/empty.html $BASE_DIR/eum.html
fi

# make sure nginx can access the eum file
chmod 644 $BASE_DIR/eum.html

# apply environment variables to default.conf
envsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"

