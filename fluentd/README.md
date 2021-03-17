# Logging with Fluentd

This example works with [Humio](https://humio.com/) and [ELK](https://elastic.co/). Fluentd is used to ship the logs from the containers to the logging backend.

## Build Fluentd Container

The default `fluentd` Docker image does not include the output plugin for Elasticsearch. Therefore a new Docker image based on the default image with the Elasticsearch output plugin installed should be created.

If running Robot Shop locally via `docker-compose`, the image does not need to be pushed to a registry. If running on Kubernetes, the image will need to be pushed to a registry.

Deployment is also slightly different depending on which platform Robot Shop is run on. See the appropriate subdirectories for the required files and further instructions.

