#!/bin/sh

# get the tag info
eval $(egrep '[A-Z]+=' ../.env)

echo "Repo $REPO"
echo "Tag $TAG"

docker run \
    -it \
    --rm \
    --network=host \
    -e 'HOST=http://localhost:8080' \
    ${REPO}/rs-load:${TAG}

