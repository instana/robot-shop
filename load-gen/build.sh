#!/bin/sh

# save REPO if set
if [ -n "$REPO" ]
then
    SAVED_REPO="$REPO"
else
    unset SAVED_REPO
fi

# get the tag info
eval "$(egrep '[A-Z]+=' ../.env)"

# restore REPO
if [ -n "$SAVED_REPO" ]
then
    REPO="$SAVED_REPO"
fi

echo "Repo $REPO"
echo "Tag $LOAD_TAG"

docker build -t ${REPO}/robot-shop-rs-load:${LOAD_TAG} . && docker tag ${REPO}/robot-shop-rs-load:${LOAD_TAG} ${REPO}/robot-shop-rs-load

if [ "$1" = "push" ]
then
    echo "pushing..."
    docker push ${REPO}/robot-shop-rs-load:${LOAD_TAG}
    docker push ${REPO}/robot-shop-rs-load
fi
