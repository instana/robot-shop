# Sample Microservice Application

Stan's Robot Shop is a sample microservice application you can use as a sandbox to test and learn containerised application orchestration and monitoring techniques. It is not intended to be a comprehensive reference example of how to write a microservices application, although you will better understand some of those concepts by playing with Stan's Robot Shop. To be clear, the error handling is patchy and there is not any security built into the application.

You can get more detailed information from my [blog post](https://www.instana.com/blog/stans-robot-shop-sample-microservice-application/) about this sample microservice application.

This sample microservice application has been built using these technologies:
- NodeJS ([Express](http://expressjs.com/))
- Java ([Spark Java](http://sparkjava.com/))
- Python ([Flask](http://flask.pocoo.org))
- Golang
- MongoDB
- Redis
- MySQL ([Maxmind](http://www.maxmind.com) data)
- RabbitMQ
- Nginx
- AngularJS (1.x)

The various services in the sample application already include all required Instana components installed and configured. The Instana components provide automatic instrumentation for complete end to end [tracing](https://docs.instana.io/core_concepts/tracing/), as well as complete visibility into time series metrics for all the technologies.

To see the application performance results in the Instana dashboard, you will first need an Instana account. Don't worry a [trial account](https://instana.com/trial?utm_source=github&utm_medium=robot_shop) is free.

## Build from Source
To build from source use Docker Compose. Optionally edit the *.env* file to specify an alternative image registry and version tag; see the official [documentation](https://docs.docker.com/compose/env-file/) for more information.

    $ docker-compose build

If you modified the *.env* file and changed the image registry, you may need to push the images to that registry

    $ docker-compose push

## Run Locally
You can run it locally for testing

    $ docker-compose up

If you are running it locally on a Linux host you can also run the Instana [agent](https://docs.instana.io/quick_start/agent_setup/container/docker/) locally, unfortunately the agent is currently not supported on Mac.

## Marathon / DCOS

The manifests for robotshop are in the *DCOS/* directory. These manifests were built using a fresh install of DCOS 1.11.0. They should work on a vanilla HA or single instance install.

You may install Instana via the DCOS package manager, instructions are here: https://github.com/dcos/examples/tree/master/instana-agent/1.9

## Kubernetes
The Docker container images are all available on [Docker Hub](https://hub.docker.com/u/robotshop/). The deployment and service definition files using these images are in the *K8s* directory, use these to deploy to a Kubernetes cluster. If you pushed your own images to your registry the deployment files will need to be updated to pull from your registry; using [kompose](https://github.com/kubernetes/kompose) may be of assistance here.

If you want to deploy Stan's Robot Shop to Google Compute you will need to edit the *K8s/web-service.yaml* file and change the type from NodePort to LoadBalancer. This can also be done in the Google Compute console.

#### NOTE
I have found some issues with kompose reading the *.env* correctly, just export the variables in the shell environment to work around this.

You can also run Kubernetes locally using [minikube](https://github.com/kubernetes/minikube).

    $ kubectl create namespace robot-shop
    $ kubectl -n robot-shop create -f K8s

To deploy the Instana agent to Kubernetes, edit the *instana/instana-agent.yaml* file and insert your base64 encoded agent key. Your agent key is available from the Instana dashboard.

    $ echo -n "your agent key" | base64

Deploy the agent

    $ kubectl create -f instana/instana-agent.yaml

The agent configuration only runs the agent on nodes with the appropriate label. For minikube.

    $ kubectl label node minikube agent=instana

There is also a handy script *instana/label.sh* which labels all the nodes.

## Acessing the Store
If you are running the store locally via *docker-compose up* then, the store front is available on localhost port 8080 [http://localhost:8080](http://localhost:8080/)

If you are running the store on Kubernetes via minikube then, to make the store front accessible edit the *web* service definition and change the type to *NodePort* and add a port entry *nodePort: 30080*.

    $ kubectl -n robot-shop edit service web

Snippet

    spec:
      ports:
      - name: "8080"
        port: 8080
        protocol: TCP
        targetPort: 8080
        nodePort: 30080
      selector:
        io.kompose.service: web
      sessionAffinity: None
      type: NodePort

The store front is then available on the IP address of minikube port 30080. To find the IP address of your minikube instance.

    $ minikube ip

If you are using a cloud Kubernetes / Openshift / Mesosphere then it will be available on the load balancer of that system. There will be specific blog posts on the Instana site covering these scenarios.

## Load Generation
A separate load generation utility is provided in the *load-gen* directory. This is not automatically run when the application is started. The load generator is built with Python and [Locust](https://locust.io). The *build.sh* script builds the Docker image, optionally taking *push* as the first argument to also push the image to the registry. The registry and tag settings are loaded from the *.env* file in the parent directory. The script *load-gen.sh* runs the image, edit this and set the HOST environment variable to point the load at where you are running the application. You could run this inside an orchestration system (K8s) as well if you want to, how to do this is left as an exercise for the reader.

## End User Monitoring
To enable End User Monitoring (EUM) see the official [documentation](https://docs.instana.io/products/website_monitoring/) for how to create a configuration. There is no need to inject the javascript fragment into the page, this will be handled automatically. Just make a note of the unique key and set the environment variable INSTANA_EUM_KEY for the *web* image, see *docker-compose.yaml* for an example.

If you are running the Instana backend on premise, you will also need to set the Reporting URL to your local instance. Set the environment variable INSTANA_EUM_REPORTING_URL as above. See the Instana EUM API [reference](https://docs.instana.io/products/website_monitoring/api/#api-structure)