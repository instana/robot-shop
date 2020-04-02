#/bin/bash

services=(cart catalogue dispatch payment user)

for s in "${services[@]}"
do
    echo "Patching service $s"

    oc -n robot-shop patch deploymentconfig $s --type=json --patch '
    [
    {
        "op": "add",
        "path": "/spec/template/spec/containers/0/env",
        "value": [
            {
                "name": "INSTANA_AGENT_HOST",
                "valueFrom": {
                    "fieldRef": {
                        "fieldPath": "status.hostIP"
                    }
                }
            }
        ]
    }
    ]
    '
done