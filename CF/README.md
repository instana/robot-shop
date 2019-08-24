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

cf cs p.mysql db-small mysql
cf cs mongodb-odb replica_set_small mongodb
cf cs p.redis cache-small redis
cf cs p.rabbitmq single-node-3.7 rabbitmq
```

## First app push

RobotShop relies on specific binding names between services and apps, so we first push the apps without creating instances (all instance counts in the manifest are `0`).

From the root of the repo:

```sh
cf push -f CF/manifest.yml
```

## Bind services

```sh
cf bind-service mongo-init mongodb --binding-name catalogue_database
cf bind-service ratings mysql --binding-name ratings_database

cf bind-service catalogue mongodb --binding-name catalog_database

cf bind-service cart redis --binding-name cart_cache

cf bind-service shipping mysql --binding-name shipping_database

cf bind-service user redis --binding-name users_cache
cf bind-service user mongodb --binding-name users_database

cf bind-service payment rabbitmq --binding-name dispatch_queue

cf bind-service dispatch rabbitmq --binding-name dispatch_queue
```

## Init MongoDB

```sh
cf run-task mongo-init 'node init-db.js' --name "Init MongoDB"
```

## Init MySQL

This one is not automated yet, as the `mysql-init` task app chokes on the `init.sql`.
Something that "works" is to `bosh ssh` on the MySQL and run the database init via commandline (`mysql` is on the path) using the credentials one finds by doing `cf env shipping`.
First import `init.sql` and then the following:

```sql
CREATE DATABASE ratings
DEFAULT CHARACTER SET 'utf8';

USE ratings;

CREATE TABLE ratings (
    sku varchar(80) NOT NULL,
    avg_rating DECIMAL(3, 2) NOT NULL,
    rating_count INT NOT NULL,
    PRIMARY KEY (sku)
) ENGINE=InnoDB;
```

The above is the content of the [ratings sql init script](../mysql/20-ratings.sql) minus the unnecessary user privs.

## Configure EUM

Create a website in Instana.
Edit the `web/static/eum.html` file accordingly, specifically replacing the values of the `reportingUrl` and `key` ienums.

## Spin up the containers

```sh
cf cart -i 1 web
cf cart -i 1 ratings
cf scale -i 1 cart
cf scale -i 1 catalogue
cf scale -i 1 shipping
cf scale -i 1 user
cf scale -i 1 payment
cf scale -i 1 dispatch
```
