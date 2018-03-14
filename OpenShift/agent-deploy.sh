#!/bin/sh

if [ "$1" = "p" ]
then
    YAML=instana-agent-os-private.yaml
else
    YAML=instana-agent-os.yaml
fi

oc login -u system:admin
oc create -f $YAML
oc project instana-agent
oc adm policy add-scc-to-user privileged -z instana-admin
oc label node localhost agent=instana
oc adm policy add-role-to-user admin developer -n instana-agent

oc login -u developer

