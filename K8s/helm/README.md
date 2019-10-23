# Stan's Robot Shop

Use this helm chart to customise your install of Stan's Robot Shop.

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

## Payment Gateway

By default the `payment` service uses https://www.paypal.com as the pseudo payment provider. The code only does a HTTP GET against this url. You can use a different url.

```shell
$ helm install --set payment.gateway=https://foobar.com ...
```

## End User Monitoring

Optionally End User Monitoring can be enabled for the web pages. Take a look at the [documentation](https://docs.instana.io/products/website_monitoring/) to see how to get a key and an endpoint url.

```shell
$ helm install \
    --set eum.key=xxxxxxxxx \
    --set eum.url=https://eum-eu-west-1.instana.io \
    ...
```

