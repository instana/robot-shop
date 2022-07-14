kubectl create ns robot-shop

helm install robot-shop --namespace robot-shop helm

helm install mysql-exporter prometheus-community/prometheus-mysql-exporter -f mysql/mysql-values.yaml -n robot-shop

helm install redis-exporter prometheus-community/prometheus-redis-exporter -f redis/redis-values.yaml -n robot-shop

helm install rabbitmq-exporter prometheus-community/prometheus-rabbitmq-exporter -f rabbitmq/rabbitmq-values.yaml -n robot-shop

helm install percona-mongodb prometheus-community/prometheus-mongodb-exporter -f mongodb/mongodb-exporter-values.yaml -n robot-shop

kubectl apply -f mongodb/mongodb-exporter-servicemonitor.yaml
            
