#!/usr/bin/env sh

### robot-shop ingress for demo cluster located at: https://github.com/asserts/stage/blob/main/demo/resources/ingresses/nginx/ingress-demo.yaml in argo

### ingress-nginx controller for demo cluster located at: https://github.com/asserts/stage/blob/main/demo/apps/ingress-nginx.yaml in argo

# helm upgrade --install robot-shop --namespace robot-shop --set "serviceMonitor.releaseLabel=kube-prometheus-stack" --set "redis.storageClassName=gp2" --set "rabbitmq.enableExporter=true" helm

# check diff
helm diff upgrade robot-shop --namespace robot-shop --set "serviceMonitor.releaseLabel=kube-prometheus-stack" --set "redis.storageClassName=gp2" --set "rabbitmq.enableExporter=true" helm --allow-unreleased

