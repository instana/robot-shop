# RobotShop on PCF [WIP]

## Requirements

The following tiles up and running in the PCF foundation:

- [Pivotal Application Service](https://network.pivotal.io/products/elastic-runtime)
- [RabbitMQ for PCF](https://network.pivotal.io/products/p-rabbitmq/)
- [Redis for PCF](https://network.pivotal.io/products/p-redis/)
- [MySQL for PCF](https://network.pivotal.io/products/pivotal-mysql/)
- [MongoDB Enterprise Service for PCF](https://network.pivotal.io/products/mongodb-enterprise-service/)
- [Instana Microservices Application Monitoring for PCF](https://network.pivotal.io/products/instana-microservices-application-monitoring/)

## Create an organization and a space

```sh
cf create-org stan
cf create-space -o stan robotshop
```

## Ensure routes are available

The following routes must be available for use:

- `web.<domain>`
- `ratings.<domain>`
- `cart.<domain>`
- `catalogue.<domain>`
- `shipping.<domain>`
- `user.<domain>`
- `payment.<domain>`
- `dispatch.<domain>`

## Set up the services

```sh
cf target -o stan -s robotshop
```

## Build applications

Build the Java apps, from the repository root:

```sh
pushd shipping && ./mvnw clean package && popd
```

## First app push

RobotShop relies on specific binding names between services and apps, so we first push the apps without creating instances (all instance counts in the manifest are `0`).

From the root of the repo:

```sh
cf push -f CF/manifest.yml
```

## Create the services

```sh
cf cs p.mysql db-small mysql-cities
cf cs p.mysql db-small mysql-ratings
cf cs mongodb-odb replica_set_small mongodb
cf cs p.redis cache-small redis
cf cs p.rabbitmq single-node-3.7 rabbitmq
```

## Init MongoDB

```sh
cf run-task mongo-init 'node init-db.js' --name "Init MongoDB"
```

## Init MySQL databases

### Ratings database

```sh
cf bind-service mysql-init mysql-ratings --binding-name ratings_database
cf run-task mysql-init 'node init-db.js init-ratings.sql ratings_database' --name "Init Ratings database"
```

### Shipping database

This one is not automated yet, as the `mysql-init` task app chokes on the large SQL init file.
Something that works is to:

1) `bosh ssh` into the MySQL virtual machine
2) Find out admin password from `/var/vcap/jobs/mysql/config/mylogin.cnf`
3) Download the ["cities" init sql file](https://github.com/mmanciop/robot-shop/raw/master/mysql/scripts/10-dump.sql.gz) and `gunzip` it
4) `/var/vcap/packages/percona-server/bin/mysql -u admin -p<adminpwd> -P 3306 -D service_instance_db < <sql_file>`

## Bind the services

Now that we have both apps and services, we can bind the former to the latter:

```sh
cf bind-service mysql-init mysql-ratings --binding-name ratings_database
cf bind-service ratings mysql-ratings --binding-name ratings_database
cf bind-service catalogue mongodb --binding-name catalogue_database
cf bind-service cart redis --binding-name cart_cache
cf bind-service shipping mysql-cities --binding-name shipping_database
cf bind-service user redis --binding-name users_cache
cf bind-service user mongodb --binding-name users_database
cf bind-service payment rabbitmq --binding-name dispatch_queue
cf bind-service dispatch rabbitmq --binding-name dispatch_queue
```

## Configure EUM

Create a website in Instana.
Edit the `web/static/eum.html` file accordingly, specifically replacing the values of the `reportingUrl` and `key` ienums.

## Spin up the containers

**Note:** Feel free to replace the value after `-i` with how many container of any one kind you want.

```sh
cf scale -i 1 web
cf scale -i 1 ratings
cf scale -i 1 cart
cf scale -i 1 catalogue
cf scale -i 1 shipping
cf scale -i 1 user
cf scale -i 1 payment
cf scale -i 1 dispatch
```
