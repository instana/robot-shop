#!/bin/sh

# set -x

oc login -u system:admin
oc adm new-project robot-shop
oc adm policy add-role-to-user admin developer -n robot-shop
oc adm policy add-scc-to-user anyuid -z default
oc adm policy add-scc-to-user privileged -z default

oc login -u developer

