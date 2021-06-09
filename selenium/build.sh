#!/bin/sh

# get the tag info
eval $(egrep '[A-Z]+=' ../.env)

echo "Repo $REPO"
echo "Tag $TAG"

docker build -t ${REPO}/rs-website-load:${TAG} . && docker tag ${REPO}/rs-website-load:${TAG} ${REPO}/rs-website-load

if [ "$1" = "push" ]
then
    echo "pushing..."
    docker push ${REPO}/rs-website-load:${TAG}
    docker push ${REPO}/rs-website-load
fi
