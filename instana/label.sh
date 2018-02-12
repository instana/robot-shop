#!/bin/sh

for NODE in $(kubectl get nodes --no-headers | awk '{print $1}' -)
do
    echo "$NODE"
    kubectl label node $NODE agent=instana
done

