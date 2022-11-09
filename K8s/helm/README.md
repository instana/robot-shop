# Stan's Robot Shop

Use this helm chart to customise your install of Stan's Robot Shop.

### Helm v2.x

```shell
$ helm install --name robot-shop --namespace robot-shop .
```

### Helm v3.x

```bash
$ kubectl create ns robot-shop
$ helm install robot-shop --namespace robot-shop .
```

## Images

By default the images are pulled from Docker Hub. Setting `image.repo` this can be changed, for example:

```shell
$ helm install --set image.repo=eu.gcr.io/acme ...
```

Will pull images from the European Google registry project `acme`.

By default the latest version of the images is pulled. A specific version can be used:

```shell
$ helm install --set image.version=0.1.2 ...
```

It is recommened to always use the latest version.

## Pod Security Policy

If you wish to enable [PSP](https://kubernetes.io/docs/concepts/policy/pod-security-policy/)

```shell
$ helm install --set psp.enabled=true ...
```

## Payment Gateway

By default the `payment` service uses https://www.paypal.com as the pseudo payment provider. The code only does a HTTP GET against this url. You can use a different url.

```shell
$ helm install --set payment.gateway=https://foobar.com ...
```

## Website Monitoring / End-User Monitoring

Optionally Website Monitoring / End-User Monitoring can be enabled for the web pages. Take a look at the [documentation](https://docs.instana.io/website_monitoring/) to see how to get a key and an endpoint url.

```shell
$ helm install \
    --set eum.key=xxxxxxxxx \
    --set eum.url=https://eum-eu-west-1.instana.io \
    ...
```

## Use with Minis

When running on `minishift` or `minikube` set `nodeport` to true. The store will then be available on the IP address of your mini and node port of the web service.

```shell
$ mini[kube|shift] ip
192.168.66.101
$ kubectl get svc web
```

Combine the IP and port number to make the URL `http://192.168.66.101:32145`

### MiniShift

Openshift is like K8s but not K8s. Set `openshift` to true or things will break. See the notes and scripts in the OpenShift directory of this repo.

```shell
$ helm install robot-shop --set openshift=true helm
```

## Deployment Parameters

| Key              | Default | Type   | Description |
| ---------------- | ------- | ------ | ----------- |
| eum.key          | null    | string | EUM Access Key |
| eum.url          | https://eum-eu-west-1.instana.io | url | EUM endpoint URL |
| image.pullPolicy | IfNotPresent | string | Kubernetes pull policy. One of Always,IfNotPresent, or Never. |
| image.repo       | robotshop | string | Base docker repository to pull the images from. |
| image.version    | latest | string | Docker tag to pull. |
| nodeport         | false | booelan | Whether to expose the services via node port. |
| openshift        | false | boolean | If OpenShift additional configuration is applied. |
| payment.gateway  | null | string | External URL end-point to simulate partial/3rd party traces. |
| psp.enabled      | false | boolean | Enable Pod Security Policy for clusters with a PSP Admission controller |
| redis.storageClassName | standard | string | Storage class to use with Redis's StatefulSet. The default for EKS is gp2. |
| ocCreateRoute    | false | boolean | If you are running on OpenShift and need a Route to the web service, set this to `true` |
| `<workload>`.affinity    | {} | object | Affinity for pod assignment on nodes with matching labels (Refer [here](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity)) |
| `<workload>`.nodeSelector    | {} | object | Node labels for pod assignment (Refer [here](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#nodeselector)) |
| `<workload>`.tolerations    | [] | list | Tolerations for pod assignment on nodes with matching taints (Refer [here](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)) |
---
> ### Notes for `affinity` and `tolerations`
> `<workload>` can be substituted with the different microservices consisting of Robot shop, namely:
> - [`cart`](./templates/cart-deployment.yaml)
> - [`catalogue`](./templates/catalogue-deployment.yaml)
> - [`dispatch`](./templates/dispatch-deployment.yaml)
> - [`mongodb`](./templates/mongodb-deployment.yaml)
> - [`mysql`](./templates/mysql-deployment.yaml)
> - [`payment`](./templates/payment-deployment.yaml)
> - [`rabbitmq`](./templates/rabbitmq-deployment.yaml)
> - [`ratings`](./templates/ratings-deployment.yaml)
> - [`redis`](./templates/redis-statefulset.yaml)
> - [`shipping`](./templates/shipping-deployment.yaml)
> - [`user`](./templates/user-deployment.yaml)
> - [`web`](./templates/web-deployment.yaml)
>
> `affinity`, `nodeSelector` and `tolerations` can be set for individual workloads.
------
## Examples for deployment using `affinities` and `tolerations`
<br />

`values.yaml`
```yaml
.
..
...
shipping:
    gateway: null
    affinity:
        nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
                - key: node-restriction.kubernetes.io/pool_0
                    operator: Exists
                    values: []
    tolerations:
        - key: "pool_0"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
        - key: "pool_0"
        operator: "Equal"
        value: "true"
        effect: "NoExecute"
    nodeSelector: {}

user:
    affinity:
        nodeAffinity:
        requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
                - key: node-restriction.kubernetes.io/pool_1
                    operator: Exists
                    values: []
    tolerations:
        - key: "pool_1"
        operator: "Equal"
        value: "true"
        effect: "NoSchedule"
        - key: "pool_1"
        operator: "Equal"
        value: "true"
        effect: "NoExecute"
    nodeSelector: {}
...
..
.
 ```

In this example, the `shipping` Pods will be deployed on only those nodes that have the label `node-restriction.kubernetes.io/pool_0` and are tainted using
```
kubectl taint node <node_name> pool_0=true:NoSchedule
kubectl taint node <node_name> pool_0=true:NoExecute
```

Similarly, the `user` Pods will be deployed on only those nodes that have the label `node-restriction.kubernetes.io/pool_1` and are tainted using
```
kubectl taint node <node_name> pool_1=true:NoSchedule
kubectl taint node <node_name> pool_1=true:NoExecute
```

Hence, this way we can control which `Robot shop` workloads are running on which nodes/nodepools.

> *Note*: `nodeSelector` will behave in a similar fashion.
