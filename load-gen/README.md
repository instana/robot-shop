# Load Generation

This is deliberately not part of docker-compose.yaml to give the option of running the sample application without load. The image is available on Docker Hub but if you want to build your own, run:

```shell
$ ./build.sh <push>
```

Will build with image and optionally push it.

```shell
$ ./load-gen.sh
```

Runs the load generation script against the application started with `docker-compose up` . There are various command line options to configure the load.

The script must be run in the load-gen directory. It logs all the php API calls into the file logs/php_services_calls.csv.

This command launches the load generator to run undefinitely (i.e. without time limits), simulating 5 clients calling the API reachable at the default URL http://localhost:8080:

```shell
$ ./load-gen.sh \
-h http://host:port/
-n 5 \
-v
```

The command also logs comprehensive details of all the API called in the file logs/calls.log, triggered by the option `-v` .

Alternatively, you can run the Container from Docker Hub directly on one of the nodes having access to the web service. Here there is an example of how to do it and an explanation for the variables involved:

```shell
$ docker run \
-d \
--rm \
--name="loadgen" \
--network=host \
--volume ${PWD}/logs:/load/logs \
--volume ${PWD}/utilities:/load/utilities \
-e "HOST=http://host:8080/"
-e "NUM_CLIENTS=5" \
-e "RUN_TIME=1h30m" \
-e "ERROR=1" \
-e "SILENT=1" \
-e "LOAD_DEBUG=0" \
robotshop/rs-load
```

Set the following environment variables to configure the load:

* HOST - The target for the load e.g. http://host:8080/
* NUM_CLIENTS - How many simultaneous load scripts to run, the bigger the number the bigger the load. The default is 1
* RUN_TIME - For NUM_CLIENTS greater than 1 the duration to run. If not set, load is run for ever with NUM_CLIENTS. See below.
* ERROR - Set this to 1 to have erroroneous calls made to the payment service.
* SILENT - Set this to 1 to surpress the very verbose output to the stdout from the script. This is a good idea if you're going to run load for more than a few minutes.
* LOAD_DEBUG - Set this to 1 to enable the output of every API call produced from the script into the log file logs/calls.log. This is a good idea if you're going to investigate over occurred events during load generation.

The load generator logs all the php API calls into the file logs/php_services_calls.csv, despite the variables SILENT and LOAD_DEBUG being set, respectively, to 1 and 0.
The content of the directory logs is cleaned everytime the script load-gen.sh is called.

## Kubernetes

To run the load test in Kubernetes, apply the `K8s/load-deployment.yaml` configuration in your Kubernetes cluster. This will deploy the load generation, check the settings in the file first.

```shell
$ kubectl -n robot-shop apply -f K8s/load-deployment.yaml
```

If you want to enable auto-scaling on relevant components (non-databases), just run the script in the autoscaling directory. However you will first need to make sure  a [metrics-server](https://kubernetes.io/docs/tasks/debug-application-cluster/resource-metrics-pipeline/) is running on your cluster, this enables the Horizontal Pod Autoscaler to know about the CPU and memory usage of the pods. From Kubernetes version 1.8, a `metrics-serer` deployment should be configured by default, run the command below to check.

```shell
$ kubectl -n kube-system get deployment
```

The autoscaling is installed with:

```shell
$ K8s/autoscale.sh
```

To get Kubernetes to automatically scale up/down the pods the load can be varied over time with:

```shell
$ ./load-gen.sh \
-h http://host:port/
-n 10 \
-t 1h30m
```

The load will be run with `10` clients for `1h30m` before dropping down to `1` client for `1h30m` then looping back to `10` clients etc.
