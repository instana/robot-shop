#!/bin/sh

# set -x

# Changing the NUM_CLIENTS environment variable varies the load on the application
# The bigger the number the more requests, the bigger the load
NUM_CLIENTS=1

# HOST where Stan's Robot Shop web UI is running
HOST="http://localhost:8080"

if [ ! -f ../.env ]
then
    echo "Please run this script from the load-gen directory"
    exit 1
fi

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
        -e "HOST=$HOST" \
        -e "NUM_CLIENTS=$NUM_CLIENTS" \
        -e 'SILENT=1' \
        ${REPO}/rs-load:${TAG}
else
    docker run \
        -it \
        --rm \
        --network=host \
        -e "HOST=$HOST" \
        -e "NUM_CLIENTS=$NUM_CLIENTS" \
        ${REPO}/rs-load:${TAG}
fi

