# Selenium-based load generator for website monitoring

This is a load generator from an end-user perspective to simulate browser behaviours to generate traffic for website monitoring.

## Build and publish the image

Below command will build the image and tag it as both `${REPO}/rs-website-load:${TAG}` and `${REPO}/rs-website-load:latest`, where the `${REPO}` and `${TAG}` come from file of [`../.env`](../.env).

```sh
$ ./build.sh
```

Adding flag of `push` in the command will push the image to the configured repository, which is Docker Hub by default:

```sh
$ ./build.sh push
```

## Run it locally

```sh
export HOST="<YOUR ROBOT SHOP HOST URL>"
docker run --name rs-website-load -e HOST -d robotshop/rs-website-load
```

> Note: to stop it, run `docker stop rs-website-load`; to delete it, run `docker rm -f rs-website-load`.

## Run it on Kubernetes / OpenShift

```sh
kubectl -n robot-shop apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rs-website-load
  labels:
    service: rs-website-load
spec:
  replicas: 1
  selector:
    matchLabels:
      service: rs-website-load
  template:
    metadata:
      labels:
        service: rs-website-load
    spec:
      containers:
      - name: rs-website-load
        env:
          - name: HOST
            value: "http://web:8080/"                 # or your robot shop app's real route URL
        #image: robotshop/rs-website-load:latest
        image: brightzheng100/rs-website-load:latest
EOF
```
