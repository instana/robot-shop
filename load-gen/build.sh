#!/bin/sh

# get the tag info
eval $(egrep '[A-Z]+=' ../.env)

echo "Repo $REPO"
echo "Tag $TAG"

docker build -t ${REPO}/rs-load:${TAG} . && docker tag ${REPO}/rs-load:${TAG} ${REPO}/rs-load

if [ "$1" = "push" ]
then
    echo "pushing..."
    docker push ${REPO}/rs-load:${TAG}
    docker push ${REPO}/rs-load
fi
