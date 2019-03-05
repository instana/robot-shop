#!/bin/sh

# Put your EUM key here
EUM_KEY=""

# set -x

# This only works for default local install of minishift
# Need to tweak some settings in OpenShift
echo "logging in as system:admin"
oc login -u system:admin

# Optionally label the nodes with role infra
for NODE in $(oc get node | awk '{if ($3 == "infra" || $3 == "<none>") print $1}' -)
do
    oc label node $NODE 'type=infra'
done

oc adm new-project robot-shop --node-selector='type=infra'
oc adm policy add-role-to-user admin developer -n robot-shop
oc adm policy add-scc-to-user anyuid system:serviceaccount:robot-shop:default

oc logout

echo " "
echo "OpenShift set up complete, ready to deploy Robot Shop now."
echo " "

