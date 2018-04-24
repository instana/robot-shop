#!/bin/sh

# Changing the NUM_CLIENTS environment variable varies the load on the application
# The bigger the number the more requests, the bigger the load

# get the tag info
eval $(egrep '[A-Z]+=' ../.env)

echo "Repo $REPO"
echo "Tag $TAG"

docker run \
    -it \
    --rm \
    --network=host \
    -e 'HOST=http://localhost:8080' \
    -e 'NUM_CLIENTS=1' \
    ${REPO}/rs-load:${TAG}

