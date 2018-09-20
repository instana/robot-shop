#!/bin/sh

# Changing the NUM_CLIENTS environment variable varies the load on the application
# The bigger the number the more requests, the bigger the load

# Set SILENT to anything to have all output discarded. Useful when running load for
# a long time to stop the disk filling up with copious log messages
# -e 'SILENT=1'

# get the tag info
eval $(egrep '[A-Z]+=' ../.env)

echo "Repo $REPO"
echo "Tag $TAG"

if [ "$1" = "-d" ]
then
    echo "running in background"
    docker run \
        -d \
        --rm \
        --network=host \
        -e 'HOST=http://localhost:8080' \
        -e 'NUM_CLIENTS=1' \
        -e 'SILENT=1' \
        ${REPO}/rs-load:${TAG}
else
    docker run \
        -it \
        --rm \
        --network=host \
        -e 'HOST=http://localhost:8080' \
        -e 'NUM_CLIENTS=1' \
        ${REPO}/rs-load:${TAG}
fi

