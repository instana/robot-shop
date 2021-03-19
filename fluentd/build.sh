#!/bin/sh

IMAGE_NAME="robotshop/fluentd:elastic"


docker build -t "$IMAGE_NAME" .

if [ "$1" = "push" ]
then
    docker push "$IMAGE_NAME"
fi

