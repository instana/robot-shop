#!/bin/sh


docker run \
    -it \
    --rm \
    --network robotshop_robot-shop \
    -e 'HOST=http://web:8080' \
    steveww/rs-load

