#!/bin/sh

IMAGE_NAME="robotshop/fluentd:elastic"

docker run \
    -d \
    --rm \
    --name fluentd \
    -p 24224:24224 \
    -v $(pwd)/fluent.conf:/fluentd/etc/fluent.conf \
    $IMAGE_NAME

