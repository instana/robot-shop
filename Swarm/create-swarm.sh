#!/bin/sh


if [ -z "$1" ]
then
    echo "Usage: create-machines.sh [local|aws]"
    exit 1
fi

case $1 in
    local)
        DRIVER=virtualbox
        ;;
    aws)
        DRIVER=amazonec2
        ;;
    *)
        echo "Unknown option"
        exit 1
esac

for MACHINE in master worker-1 worker-2
do
    echo "Creating $MACHINE"
    if [ "$DRIVER" = "aws" ]
    then
        docker-machine create \
            --driver $DRIVER \
            --amazonec2-instance-type "t2.medium" \
            $MACHINE
    else
        docker-machine create \
            --driver $DRIVER \
            $MACHINE
    fi
done

sleep 3
echo " "
echo "Machines created"
echo "Configuring Swarm"

MASTER_IP=$(docker-machine ip master)

# create the swarm master
# connect local docker command to master machine
echo "Creating master"
eval $(docker-machine env master)
JOIN_CMD=$(docker swarm init --advertise-addr "$MASTER_IP" | awk '/^[ \t]+/{print $0}' -)

for MACHINE in $(docker-machine ls -q | fgrep worker)
do
    echo "joining from $MACHINE"
    eval $(docker-machine env $MACHINE)
    $JOIN_CMD
done

echo " "
echo "Swarm is ready"

