# Kubernetes Setup

A step-by-step guide on how to get the Robot-Shop running in Kubernetes.

First two levels of the service dependencies:

```
web (nginx)
    -> catalogue (nodejs)
        -> mongodb
    -> user (nodejs)
        -> mongodb
        -> redis
    -> cart (nodejs)
        -> redis
        -> catalgue
    -> shipping (java)
        -> mysql
        -> cart
    -> payment (python)
        -> rabbitmq
        -> cart
        -> user
    -> ratings (php)
        -> mysql
```


## Namespace

    # create a dedicated namespace
    $ kubectl create ns robot-shop

## Testing Services

Services are usually not exposed outside of the cluster. For a simple end-to-end test you can temporarily expose that service and test it with curl:

    # expose cart service
    $ kubectl expose deployment cart --type=LoadBalancer --name=test-cart-svc -n robot-shop

    # get the external endpoint IP
    $ kubectl get svc test-cart-svc -n robot-shop

    # test the endoint
    $ curl <EXTERNAL-IP>:8080/health

    # delete the test service
    $ kubectl delete svc test-cart-svc -n robot-shop

## Cart

    # create cart deploy & service & redis backend
    # https://github.com/instana/robot-shop/blob/master/cart/server.js
    $ kubectl create -f descriptors/cart-deployment.yaml -n robot-shop
    $ kubectl create -f descriptors/cart-service.yaml -n robot-shop
    $ kubectl create -f descriptors/redis-deployment.yaml -n robot-shop
    $ kubectl create -f descriptors/redis-service.yaml -n robot-shop

    # check deployment 
    $ kubectl get deploy,po,svc -n robot-shop

    # test cart service
    $ curl <EXTERNAL-CART-IP>:8080/health

## Catalogue

    # create catalogue deployment & service & mongodb backend
    # https://github.com/instana/robot-shop/blob/master/catalogue/server.js
    $ kubectl create -f descriptors/catalogue-deployment.yaml -n robot-shop
    $ kubectl create -f descriptors/catalogue-service.yaml -n robot-shop
    $ kubectl create -f descriptors/mongodb-deployment.yaml -n robot-shop
    $ kubectl create -f descriptors/mongodb-service.yaml -n robot-shop

    # test catalogue service
    $ curl <EXTERNAL-CATALOGUE-IP>:8080/health
    $ curl <EXTERNAL-CATALOGUE-IP>:8080/products

    # test cart service
    $ curl <EXTERNAL-CART-IP>:8080/add/1/HAL-1/1
    $ curl <EXTERNAL-CART-IP>:8080/cart/1/

## User

    # file://../../user/server.js
    $ kubectl create -f descriptors/user-deployment.yaml -n robot-shop
    $ kubectl create -f descriptors/user-service.yaml -n robot-shop
    # mongo & redis already deployed above
    # test user service
    $ curl <EXTERNAL-USER-IP>:8080/health

## Shipping

    # 
    $ kubectl create -f descriptors/shipping-deployment.yaml -n robot-shop
    $ kubectl create -f descriptors/shipping-service.yaml -n robot-shop
    $ kubectl create -f descriptors/mysql-deployment.yaml -n robot-shop
    $ kubectl create -f descriptors/mysql-service.yaml -n robot-shop
    # cart already deployed above
    # test shipping service
    $ curl <EXTERNAL-SHIPPING-IP>:8080/health

## Payment

    $ kubectl create -f descriptors/payment-deployment.yaml -n robot-shop
    $ kubectl create -f descriptors/payment-service.yaml -n robot-shop
    # cart & user already deployed above
    $ kubectl create -f descriptors/rabbitmq-deployment.yaml -n robot-shop
    $ kubectl create -f descriptors/rabbitmq-service.yaml -n robot-shop
    $ curl <EXTERNAL-PAYMENT-IP>:8080/health

## Ratings
    $ kubectl create -f descriptors/ratings-deployment.yaml -n robot-shop
    $ kubectl create -f descriptors/ratings-service.yaml -n robot-shop
    # mysql already deployed above
    $ curl <EXTERNAL-RATINGS-IP>:8080/health


## Web

    # https://github.com/instana/robot-shop/tree/master/web
    $ kubectl create -f descriptors/web-deployment.yaml -n robot-shop
    $ kubectl create -f descriptors/web-service.yaml -n robot-shop
    
