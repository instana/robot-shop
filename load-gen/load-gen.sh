#!/bin/sh


docker run \
    -it \
    --rm \
    --network=host \
    -e 'HOST=http://localhost:8080' \
    steveww/rs-load

