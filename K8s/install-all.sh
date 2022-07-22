kubectl create ns robot-shop

helm install robot-shop --namespace robot-shop helm

helm install mysql-exporter prometheus-community/prometheus-mysql-exporter -f mysql/mysql-values.yaml -n robot-shop

helm install redis-exporter prometheus-community/prometheus-redis-exporter -f redis/redis-values.yaml -n robot-shop

helm install rabbitmq-exporter prometheus-community/prometheus-rabbitmq-exporter -f rabbitmq/rabbitmq-values.yaml -n robot-shop

helm install percona-mongodb prometheus-community/prometheus-mongodb-exporter -f mongodb/mongodb-exporter-values.yaml -n robot-shop

kubectl apply -f mongodb/mongodb-exporter-servicemonitor.yaml

# commented out since we already have an ingress controller running
#helm install ingress-nginx ingress-nginx --repo https://kubernetes.github.io/ingress-nginx -f ingress/values.yaml -n robot-shop

kubectl apply -f ingress/ingress.yaml -n robot-shop

# Enable Rabbit MQ Native Prometheus Exporter
kubectl --context kind-kind -n robot-shop exec -it $(kubectl -n robot-shop get pods -o name | grep -E "rabbitmq-[0-9].*" | sed -E 's/pod.(.+)/\1/g') --container rabbitmq -- /bin/bash -c "rabbitmq-plugins enable rabbitmq_prometheus"
