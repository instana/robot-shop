#!/bin/sh

. ./setenv.sh

docker run \
    -d \
    --rm \
    --name fluentd \
    -p 24224:24224 \
    -v $(pwd)/humio.conf:/fluentd/etc/humio.conf \
    -e FLUENTD_CONF=humio.conf \
    $IMAGE_NAME

