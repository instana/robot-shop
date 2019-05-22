# Load Generation

This is deliberately not part of docker-compose.yaml to give the option of running the sample application without load.

    $ ./build.sh <push>

Will build with image and optionally push it.

    $ ./load-gen.sh

Runs the load generation script against the application started with `docker-compose up` . There are various command line options to configure the load.

Alternatively, you can run the Container from Dockerhub directly on one of the nodes having access to the web service:

```shell
$ docker run \
-d \
--rm \
--name="loadgen" \
--network=host \
-e "HOST=http://host:8080/"
-e "HUM_CLIENTS=1" \
-e "ERROR=1" \
-e "SILENT=1" \
robotshop/rs-load
```

Set the following environment variables to configure the load:

* HOST - The target for the load e.g. http://host:8080/
* NUM_CLIENTS - How many simultaneous load scripts to run, the bigger the number the bigger the load. The default is 1
* ERROR - Set this to 1 to have erroroneous calls made to the payment service.
* SILENT - Set this to 1 to surpress the very verbose output from the script. This is a good idea if you're going to run load for more than a few minutes.

## Kubernetes

To run the load test in Kubernetes, apply the `K8s/load-deployment.yaml` configuration in your Kubernetes cluster. This will deploy the load generation, check the settings in the file first.

```shell
$ kubectl -n robot-shop apply -f K8s/load-deployment.yaml
```

If you want to enable auto-scaling on relevant components (non-databases), just run the script in the autoscaling directory. However you will first need to make sure  a [metrics-server](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-metrics-pipeline/) is running in your cluster, this enables the Horizontal Pod Autoscaler to know about the CPU and memory usage of the pods. From Kubernetes version 1.8, a `metrics-serer` deployment should be configured by default, run the command below to check.

```shell
$ kubectl -n kube-system get deployment
```

The autoscaling is installed with:

```shell
$ K8s/autoscale.sh
```

