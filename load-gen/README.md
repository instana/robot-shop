# Load Generation

This is deliberately not part of docker-compose.yaml to give the option of running the sample application without load.

    $ ./build.sh <push>

Will build with image and optionally push it.

    $ ./load-gen.sh

Runs the load generation script against the application started with docker-compose up

Alternatively, you can run the Container from Dockerhub directly on one of the nodes having access to the web node:

`docker run -e 'HOST=$webnodeIP:8080' -e 'NUM_CLIENTS=3' -d --rm --name="loadgen" robotshop/rs-load`

## Kubernetes

To run the load test in Kubernetes, apply the `K8s/autoscaling/load-deployment.yaml` configuration in your Kubernetes cluster. This will a replica of the above load test

    kubectl -n robot-shop apply -f K8s/autoscaling/load-deployment.yaml

If you want to enable auto-scaling on relevant components (non-databases), you can apply everything in that directory. However you will first need to run a `metrics-server` in your cluster so the Horizontal Pod Autoscaler can know about the CPU usage of the pods.

    kubectl -n robot-shop apply -f K8s/autoscaling/

