# Logging with Fluentd

This example works with [Humio](https://humio.com/) and [ELK](https://elastic.co/). Fluentd is used to ship the logs from the containers to the logging backend.

## Build Fluentd Container

The default `fluentd` Docker image does not include the output plugin for Elasticsearch. Therefore a new Docker image based on the default image with the Elasticsearch output plugin installed should be created, see the `Dockerfile` and `build.sh` script for examples. This example has already been built and pushed to Docker Hub.

Deployment is slightly different depending on which platform Robot Shop is run on. See the appropriate subdirectories for the required files and further instructions.

