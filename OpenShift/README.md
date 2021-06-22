# Instana Agent Installation

See the official [documentation](https://docs.instana.io/quick_start/agent_setup/container/openshift/) for how to install the Instana agent on an OpenShift environment.

# Robot Shop Deployment

## OCP 3.x 

For OpenShift run the `setup.sh` script to create the project and set the extra permissions.

Use the Helm chart for Kubernetes to install Stan's Robot Shop. To install on Minishift.

### Helm 3

```shell
$ cd K8s
$ oc login -u developer
$ oc project robot-shop
$ helm install robot-shop --set openshift=true --set nodeport=true helm
```

To connect to the shop.

```shell
$ minishift ip
192.168.99.106
$ oc get svc web
NAME      TYPE       CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
web       NodePort   172.30.180.253   <none>        8080:31147/TCP   4m
```

Use the IP and the node port to form the URL `http://192.168.99.106:31147/`

## OCP 4.x

For Openshift cluster in version 4.x follow these steps:

```
export KUBECONFIG=/path/to/oc/cluster/dir/auth/kubeconfig
oc adm new-project robot-shop
oc adm policy add-scc-to-user anyuid -z default -n robot-shop
oc adm policy add-scc-to-user privileged -z default -n robot-shop
cd robot-shop/K8s
helm install robot-shop --set openshift=true -n robot-shop helm
```



