#!/bin/sh

for DFILE in $(find . -name Dockerfile -print)
do
    # multiple images
    for IMAGE in $(awk '/^FROM/ { print $2 }' $DFILE)
    do
        echo "Pulling $IMAGE"
        docker pull $IMAGE
    done
done
