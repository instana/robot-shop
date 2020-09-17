import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as ecs_patterns from "@aws-cdk/aws-ecs-patterns";
import * as autoscaling from "@aws-cdk/aws-autoscaling";

import * as path from 'path';
import { InstanaEcsAgent, InstanaEnvPropsClassic, InstanaEnvPropsEum } from './instanaAgent';

export class RobotShopEcsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps, instanaEnvPropsClassic?: InstanaEnvPropsClassic, instanaEnvPropsEum?: InstanaEnvPropsEum) {
    super(scope, id, props);

    const REPO = "robotshop";
    const TAG = "0.4.30";

    const CART_HOST = "cart.robot-shop";
    const CATALOGUE_HOST = "catalogue.robot-shop";
    const DISPATCH_HOST = "dispatch.robot-shop";
    const MONGODB_HOST = "mongodb.robot-shop";
    const MYSQL_HOST = "mysql.robot-shop";
    const PAYMENT_HOST = "payment.robot-shop";
    const RABBITMQ_HOST = "rabbitmq.robot-shop";
    const RATINGS_HOST = "ratings.robot-shop";
    const REDIS_HOST = "redis.robot-shop";
    const SHIPPING_HOST = "shipping.robot-shop";
    const USER_HOST = "user.robot-shop";

    const CART_PORT = 8080;
    const CATALOGUE_PORT = 8080;
    const DISPATCH_PORT = 8080;
    const MONGODB_PORT = 27017;
    const MYSQL_PORT = 3306;
    const PAYMENT_PORT = 8080;
    const RABBITMQ_PORT = [5671, 5672];
    const RATINGS_PORT = 80;
    const REDIS_PORT = 6379;
    const SHIPPING_PORT = 8080;
    const USER_PORT = 8080;
    const WEB_PORT = 8080;    

    const vpc = new ec2.Vpc(this, "vpc");

    const asg = new autoscaling.AutoScalingGroup(this, "robot-shop-asg", {
      vpc: vpc,
      machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.SMALL),
      minCapacity: 6
    });

    const cluster = new ecs.Cluster(this, "Robot-Shop", {
      vpc: vpc
    });
    cluster.addAutoScalingGroup(asg);
    cluster.addDefaultCloudMapNamespace({ name: "robot-shop" });

    // ### MongoDB ###
    const mongodbTask = new ecs.Ec2TaskDefinition(this, "mongodbTask", { networkMode: ecs.NetworkMode.AWS_VPC });
    mongodbTask.addContainer("mongodbContainer", {
      image: ecs.ContainerImage.fromRegistry(`${REPO}/rs-mongodb:${TAG}`),
      memoryReservationMiB: 256,
      logging: ecs.AwsLogDriver.awsLogs({ streamPrefix: "robot-shop" }),
      environment: {
        ...instanaEnvPropsClassic
      }
    }).addPortMappings({ containerPort: MONGODB_PORT });

    const mongodbService = new ecs.Ec2Service(this, "MongoDbService", {
      cluster: cluster,
      taskDefinition: mongodbTask,
      assignPublicIp: false
    });
    mongodbService.enableCloudMap({ name: "mongodb" });
    mongodbService.connections.allowFromAnyIpv4(ec2.Port.tcp(MONGODB_PORT));

    // ### Mysql ###
    const mysqlTask = new ecs.Ec2TaskDefinition(this, "mysqlTask", { networkMode: ecs.NetworkMode.AWS_VPC });
    mysqlTask.addContainer("mysqlContainer", {
      image: ecs.ContainerImage.fromRegistry(`${REPO}/rs-mysql-db:${TAG}`),
      memoryReservationMiB: 256,
      logging: ecs.AwsLogDriver.awsLogs({ streamPrefix: "robot-shop" }),
      environment: {
        ...instanaEnvPropsClassic
      }
    }).addPortMappings({ containerPort: MYSQL_PORT });
    const mysqlService = new ecs.Ec2Service(this, "MysqlService", {
      cluster: cluster,
      taskDefinition: mysqlTask,
      assignPublicIp: false
    });
    mysqlService.enableCloudMap({ name: "mysql" });
    mysqlService.connections.allowFromAnyIpv4(ec2.Port.tcp(MYSQL_PORT));

    // ### Redis ###
    const redisTask = new ecs.Ec2TaskDefinition(this, "redisTask", { networkMode: ecs.NetworkMode.AWS_VPC });
    redisTask.addContainer("redisContainer", {
      image: ecs.ContainerImage.fromRegistry(`redis:4.0.6`),
      memoryReservationMiB: 256,
      logging: ecs.AwsLogDriver.awsLogs({ streamPrefix: "robot-shop" }),
      environment: {
        ...instanaEnvPropsClassic
      }
    }).addPortMappings({ containerPort: REDIS_PORT });
    const redisService = new ecs.Ec2Service(this, "RedisService", {
      cluster: cluster,
      taskDefinition: redisTask,
      assignPublicIp: false
    });
    redisService.enableCloudMap({ name: "redis" });
    redisService.connections.allowFromAnyIpv4(ec2.Port.tcp(REDIS_PORT));

    // ### RabbitMQ ###
    const rabbitmqTask = new ecs.Ec2TaskDefinition(this, "rabbitmqTask", { networkMode: ecs.NetworkMode.AWS_VPC });
    rabbitmqTask.addContainer("rabbitmqContainer", {
      image: ecs.ContainerImage.fromRegistry(`rabbitmq:3.7-management-alpine`),
      memoryReservationMiB: 256,
      logging: ecs.AwsLogDriver.awsLogs({ streamPrefix: "robot-shop" }),
      environment: {
        ...instanaEnvPropsClassic
      }
    }).addPortMappings({ containerPort: RABBITMQ_PORT[0] }, { containerPort: RABBITMQ_PORT[1] });
    const rabbitMqService = new ecs.Ec2Service(this, "RabbitMqService", {
      cluster: cluster,
      taskDefinition: rabbitmqTask,
      assignPublicIp: false
    });
    rabbitMqService.enableCloudMap({ name: "rabbitmq" });
    rabbitMqService.connections.allowFromAnyIpv4(ec2.Port.tcpRange(RABBITMQ_PORT[0], RABBITMQ_PORT[1]));

    // ### Catalogue ###
    const catalogueTask = new ecs.Ec2TaskDefinition(this, "catalogueTask", { networkMode: ecs.NetworkMode.AWS_VPC });
    catalogueTask.addContainer("catalogueContainer", {
      image: ecs.ContainerImage.fromRegistry(`${REPO}/rs-catalogue:${TAG}`),
      memoryReservationMiB: 256,
      logging: ecs.AwsLogDriver.awsLogs({ streamPrefix: "robot-shop" }),
      environment: {
        "MONGO_URL": `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/catalogue`,
        ...instanaEnvPropsClassic
      }
    }).addPortMappings({ containerPort: CATALOGUE_PORT });
    const catalogueService = new ecs.Ec2Service(this, "CatalogueService", {
      cluster: cluster,
      taskDefinition: catalogueTask,
      assignPublicIp: false
    });
    catalogueService.enableCloudMap({ name: "catalogue" });
    catalogueService.connections.allowFromAnyIpv4(ec2.Port.tcp(CATALOGUE_PORT));

    // ### User ###
    const userTask = new ecs.Ec2TaskDefinition(this, "userTask", { networkMode: ecs.NetworkMode.AWS_VPC });
    userTask.addContainer("userContainer", {
      image: ecs.ContainerImage.fromRegistry(`${REPO}/rs-user:${TAG}`),
      memoryReservationMiB: 256,
      logging: ecs.AwsLogDriver.awsLogs({ streamPrefix: "robot-shop" }),
      environment: {
        "MONGO_URL": `mongodb://${MONGODB_HOST}:${MONGODB_PORT}/catalogue`,
        "REDIS_HOST": REDIS_HOST,
        ...instanaEnvPropsClassic
      }
    }).addPortMappings({ containerPort: USER_PORT });
    const userService = new ecs.Ec2Service(this, "UserService", {
      cluster: cluster,
      taskDefinition: userTask,
      assignPublicIp: false
    });
    userService.enableCloudMap({ name: "user" });
    userService.connections.allowFromAnyIpv4(ec2.Port.tcp(USER_PORT));

    // ### Cart ###
    const cartTask = new ecs.Ec2TaskDefinition(this, "cartTask", { networkMode: ecs.NetworkMode.AWS_VPC });
    cartTask.addContainer("cartContainer", {
      image: ecs.ContainerImage.fromRegistry(`${REPO}/rs-cart:${TAG}`),
      memoryReservationMiB: 256,
      logging: ecs.AwsLogDriver.awsLogs({ streamPrefix: "robot-shop" }),
      environment: {
        "REDIS_HOST": REDIS_HOST,
        "CATALOGUE_HOST": CATALOGUE_HOST,
        ...instanaEnvPropsClassic
      }
    }).addPortMappings({ containerPort: CART_PORT });
    const cartService = new ecs.Ec2Service(this, "CartService", {
      cluster: cluster,
      taskDefinition: cartTask,
      assignPublicIp: false
    });
    cartService.enableCloudMap({ name: "cart" });
    cartService.connections.allowFromAnyIpv4(ec2.Port.tcp(CART_PORT));

    // ### Shipping ###
    const shippingTask = new ecs.Ec2TaskDefinition(this, "shippingTask", { networkMode: ecs.NetworkMode.AWS_VPC });
    shippingTask.addContainer("shippingContainer", {
      image: ecs.ContainerImage.fromRegistry(`${REPO}/rs-shipping:${TAG}`),
      memoryReservationMiB: 256,
      logging: ecs.AwsLogDriver.awsLogs({ streamPrefix: "robot-shop" }),
      environment: {
        "DB_HOST": MYSQL_HOST,
        "CART_ENDPOINT": `${CART_HOST}:${CART_PORT}`,
        ...instanaEnvPropsClassic
      }
    }).addPortMappings({ containerPort: SHIPPING_PORT });
    const shippingService = new ecs.Ec2Service(this, "ShippingService", {
      cluster: cluster,
      taskDefinition: shippingTask,
      assignPublicIp: false
    });
    shippingService.enableCloudMap({ name: "shipping" });
    shippingService.connections.allowFromAnyIpv4(ec2.Port.tcp(SHIPPING_PORT));

    // ### Ratings ###
    const ratingsTask = new ecs.Ec2TaskDefinition(this, "ratingsTask", { networkMode: ecs.NetworkMode.AWS_VPC });
    ratingsTask.addContainer("ratingsContainer", {
      image: ecs.ContainerImage.fromRegistry(`${REPO}/rs-ratings:${TAG}`),
      memoryReservationMiB: 256,
      logging: ecs.AwsLogDriver.awsLogs({ streamPrefix: "robot-shop" }),
      environment: {
        "PDO_URL": `mysql:host=${MYSQL_HOST};dbname=ratings;charset=utf8mb4`,
        "CATALOGUE_URL": `http://${CATALOGUE_HOST}:${CATALOGUE_PORT}/`,
        ...instanaEnvPropsClassic
      }
    }).addPortMappings({ containerPort: RATINGS_PORT });
    const ratingsService = new ecs.Ec2Service(this, "RatingsService", {
      cluster: cluster,
      taskDefinition: ratingsTask,
      assignPublicIp: false
    });
    ratingsService.enableCloudMap({ name: "ratings" });
    ratingsService.connections.allowFromAnyIpv4(ec2.Port.tcp(RATINGS_PORT));

    // ### Payment ###
    const paymentTask = new ecs.Ec2TaskDefinition(this, "paymentTask", { networkMode: ecs.NetworkMode.AWS_VPC });
    paymentTask.addContainer("paymentContainer", {
      image: ecs.ContainerImage.fromRegistry(`${REPO}/rs-payment:${TAG}`),
      memoryReservationMiB: 256,
      logging: ecs.AwsLogDriver.awsLogs({ streamPrefix: "robot-shop" }),
      environment: {
        "AMQP_HOST": RABBITMQ_HOST,
        "CART_HOST": CART_HOST,
        "USER_HOST": USER_HOST,
        ...instanaEnvPropsClassic
      }
    }).addPortMappings({ containerPort: PAYMENT_PORT });
    const paymentService = new ecs.Ec2Service(this, "PaymentService", {
      cluster: cluster,
      taskDefinition: paymentTask,
      assignPublicIp: false
    });
    paymentService.enableCloudMap({ name: "payment" });
    paymentService.connections.allowFromAnyIpv4(ec2.Port.tcp(PAYMENT_PORT));

    // ### Dispatch ###
    const dispatchTask = new ecs.Ec2TaskDefinition(this, "dispatchTask", { networkMode: ecs.NetworkMode.AWS_VPC });
    dispatchTask.addContainer("dispatchContainer", {
      image: ecs.ContainerImage.fromRegistry(`${REPO}/rs-dispatch:${TAG}`),
      memoryReservationMiB: 256,
      logging: ecs.AwsLogDriver.awsLogs({ streamPrefix: "robot-shop" }),
      environment: {
        "AMQP_HOST": RABBITMQ_HOST,
        ...instanaEnvPropsClassic
      }
    }).addPortMappings({ containerPort: DISPATCH_PORT });
    const dispatchService = new ecs.Ec2Service(this, "DispatchService", {
      cluster: cluster,
      taskDefinition: dispatchTask,
      assignPublicIp: false
    });
    dispatchService.enableCloudMap({ name: "dispatch" });
    dispatchService.connections.allowFromAnyIpv4(ec2.Port.tcp(DISPATCH_PORT));

    // ### Web ###
    const webTask = new ecs.Ec2TaskDefinition(this, "webTask", { networkMode: ecs.NetworkMode.AWS_VPC });
    webTask.addContainer("webContainer", {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, "../../web"), { buildArgs: { "NGINX_TEMPLATE": "default.conf.aws.template" } }),
      memoryReservationMiB: 256,
      logging: ecs.AwsLogDriver.awsLogs({ streamPrefix: "robot-shop" }),
      environment: {
        "CATALOGUE_HOST": CATALOGUE_HOST,
        "USER_HOST": USER_HOST,
        "CART_HOST": CART_HOST,
        "SHIPPING_HOST": SHIPPING_HOST,
        "PAYMENT_HOST": PAYMENT_HOST,
        "RATINGS_HOST": RATINGS_HOST,
        ...instanaEnvPropsEum
      }
    }).addPortMappings({ containerPort: WEB_PORT });
    const webService = new ecs_patterns.ApplicationLoadBalancedEc2Service(this, "WebService", {
      cluster: cluster,
      taskDefinition: webTask,
      publicLoadBalancer: true
    });

    // ### Enable Instana ###
    new InstanaEcsAgent(this, cluster, instanaEnvPropsClassic);
  }
}
