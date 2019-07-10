# Instana Agent Install

With the new release of Kubernetes support for Instana, the agent install is now available as a helm [chart](https://hub.helm.sh/charts/stable/instana-agent). This is the easiest way to install the agent, however if you really want to do it by hand, template descriptors are available in the official [documentation](https://docs.instana.io/ecosystem/kubernetes/).

# Quotas and Scaling

You can apply resource quotas to the namespace where you installed Stan's Robot Shop.

```shell
$ kubectl -n robot-shop apply -f resource-quota.yaml
```

The quotas and usage are shown in the Instana Kubernetes dashboards.

Optinally you can also run the `autoscale.sh` script to configure automatic scaling of the deployments. You will need to edit the script if you did not deploy to the `robot-shop` namespace. Varying the load on the application will cause Kubernetes to scale up/down the various deployments.

# Istio

Stan's Robot Shop will run on Kubernetes with Istio service mesh. Configure Istio ingress.

```shell
$ kubectl -n robot-shop apply -f Istio/gateway.yaml
```

Now use the exposed Istio gateway to access Robot Shop.

```shell
$ kubectl -n istio-system get svc istio-ingressgateway
```

The above will display the IP address of the Istio gateway.

**NOTE** The Instana agent only works with later versions of Istio.