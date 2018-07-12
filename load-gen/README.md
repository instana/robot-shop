# Load Generation

This is deliberately not part of docker-compose.yaml to give the option of running the sample application without load.

    $ ./build.sh <push>

Will build with image and optionally push it.

    $ ./load-gen.sh

Runs the load generation script against the application started with docker-compose up

Alternatively, you can run the Container from Dockerhub directly on one of the nodes having access to the web node:

`docker run -e 'HOST=$webnodeIP:8080' -e 'NUM_CLIENTS=3' -d --rm --name="loadgen" robotshop/rs-load`

## To Do

Kubernetes deployment
