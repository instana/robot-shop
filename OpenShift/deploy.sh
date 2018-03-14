#!/bin/sh

# Put your EUM key here
EUM_KEY=""

# set -x

# This only works for default local install of minishift
# Need to tweak some settings in OpenShift
oc login -u developer
oc new-project robot-shop
oc login -u system:admin
oc adm policy add-scc-to-user anyuid system:serviceaccount:robot-shop:default
oc login -u developer
oc project robot-shop

echo "OpenShift set up complete, ready to deploy Robot Shop now."
/bin/echo -n "Enter to continue: "
read CONTINUE

# set the environment from the .env file
for VAR in $(egrep '^[A-Z]+=' ../.env)
do
    export $VAR
done


# import all the images from docker hub into OpenShift
for LINE in $(awk '/^ {2}[a-z]+:$/ {printf "%s", $0} /image: / {print $2}' ../docker-compose.yaml)
do
    NAME=$(echo "$LINE" | cut -d: -f1)
    IMAGE=$(echo "$LINE" | cut -d: -f2-)
    FULL_IMAGE=$(eval "echo $IMAGE")

    echo "NAME $NAME"
    echo "importing $FULL_IMAGE"

    oc import-image $FULL_IMAGE --from $FULL_IMAGE --confirm
    # a bit of a hack but appears to work
    BASE=$(basename $FULL_IMAGE)
    oc new-app -i $BASE --name $NAME
done

# Set EUM environment if required
if [ -n "$EUM_KEY" ]
then
    oc set env dc/web INSTANA_EUM_KEY=$EUM_KEY
fi

