# STAN'S ROBOT SHOP

This is a simple example microservices application for use with Instana tutorials. It is not a reference example of how to write a microservices application, the error handling is patchy and the security is pretty much nonexistent.

The application is built using these technologies:
- NodeJS (Express)
- Java (Spark Java)
- Python (Flask)
- Golang
- MongoDB
- Redis
- MySQL
- RabbitMQ
- AngularJS (1.x) 

You will need an Instana account to see the results in the Instana dashboard. If you do not already have an account, sign up for a [free trail](https://instana.com).

## Build from Source
To build from source use Docker Compose. Optionally edit the *.env* file to specify an alternative image registry and version tag; see the official [documentation](https://docs.docker.com/compose/env-file/) for more information.

    $ docker-compose build

If you modified the *.env* file and changed the image registry, you may need to push the images to that registry

    $ docker-compose push

## Run Locally
You can run it locally for testing

    $ docker-compose up

If you are running it locally on a Linux host you can also run the Instana [agent](https://docs.instana.io/quick_start/agent_setup/container/docker/) locally, unfortunately the agent is currently not supported on Mac.

## Kubernetes
The Docker container images are all available on [Docker Hub](https://hub.docker.com/u/steveww/). The deployment and service definition files using these images are in the K8s directory, use these to deploy to a Kubernetes cluster. If you pushed your own images to your own registry the deployment files will need to be updated to pull from your registry; using [kompose](https://github.com/kubernetes/kompose) may be of assistance here. *NOTE* I have found some issues with kompose reading the *.env* correctly, just export the variables in the shell environment to work around this.

You can also run Kubernetes locally using [minikube](https://github.com/kubernetes/minikube).

    $ kubectl create namespace robot-shop
    $ kubectl -n robot-shop create -f K8s

To deploy the Instana agent to Kubernetes, edit the *instana/instana-agent.yaml* file and insert your base64 encoded agent key. Your agent key is available from the Instana dashboard.

    $ echo -n "your agent key" | base64

Deploy the agent

    $ kubectl create -f instana/instana-agent.yaml

The agent configuration only runs the agent on nodes with the appropriate label.

    $ kubectl label node minikube agent=instana

## Acessing the Store
If you are running the store locally via *docker-compose up* then, the store front is available on localhost port 8080 [http://localhost:8080](http://localhost:8080/)

If you are running the store on Kubernetes via minikube then, the store front is available on the IP address of minikube port 8080. To find the IP address of your minikube instance.

    $ minikube ip

## TO DO

- End User Monitoring
- Load generation script
