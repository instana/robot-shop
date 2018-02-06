# Load Generation

This is deliberately not part of docker-compose.yaml to give the option of running the sample application without load.

    $ ./build.sh <push>

Will build with image and optionally push it.

    $ ./load-gen.sh

Runs the load generation script against the application started with docker-compose up

## To Do

Kubernetes deployment
