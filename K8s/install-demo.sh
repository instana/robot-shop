#!/usr/bin/env sh

### robot-shop ingress for demo cluster located at: https://github.com/asserts/stage/blob/main/demo/resources/ingresses/nginx/ingress-demo.yaml in argo

### ingress-nginx controller for demo cluster located at: https://github.com/asserts/stage/blob/main/demo/apps/ingress-nginx.yaml in argo

# helm upgrade --install robot-shop --namespace robot-shop --set "monitor.releaseLabel=kube-prometheus-stack" --set "redis.storageClassName=gp2" --set "rabbitmq.enableExporter=true" --set "otelcollector.assertsServer=https://demo.app.asserts.ai/api-server" --set "otelcollector.assertsUser=shana@asserts.ai" --set "otelcollector.assertsEnv=prod" --set "otelcollector.assertsSite=app" helm

# check diff
helm diff upgrade robot-shop --namespace robot-shop --set "monitor.releaseLabel=kube-prometheus-stack" --set "redis.storageClassName=gp2" --set "rabbitmq.enableExporter=true" --set "otelcollector.assertsServer=https://demo.app.asserts.ai/api-server" --set "otelcollector.assertsUser=shana@asserts.ai" --set "otelcollector.assertsEnv=prod" --set "otelcollector.assertsSite=app" helm --allow-unreleased

