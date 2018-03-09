#!/bin/sh

# set -x

# Read in vars from .env file

for VAR in $(egrep '^[A-Z]+=' ../.env)
do
    export $VAR
done

# Connect to master
eval $(docker-machine env master)

docker stack deploy robot-shop -c ../docker-compose.yaml

sleep 3
echo " "
echo "Robot Shop deployed"
docker service ls

echo " "
IP=$(docker-machine ip master)
echo "Go to the shop http://${IP}:8080/ when all the services have started"
echo "This may take a while..."

