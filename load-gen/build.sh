#!/bin/sh

# get the tag info
eval $(egrep '[A-Z]+=' ../.env)

echo "Repo $REPO"
echo "Tag $LOAD_TAG"

docker build -t ${REPO}/robot-shop-rs-load:${LOAD_TAG} . && docker tag ${REPO}/robot-shop-rs-load:${LOAD_TAG} ${REPO}/robot-shop-rs-load

if [ "$1" = "push" ]
then
    echo "pushing..."
    docker push ${REPO}/robot-shop-rs-load:${LOAD_TAG}
    docker push ${REPO}/robot-shop-rs-load
fi
