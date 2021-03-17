#!/bin/sh

. ./setenv.sh

docker build -t $IMAGE_NAME .

