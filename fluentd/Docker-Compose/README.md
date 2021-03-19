# Configuration

Edit `fluent.conf` setting the parameters to match either your Humio account or Elasticsearch instance. See the [fluentd documentation](https://docs.fluentd.org/output/elasticsearch) and/or [Humio documentation](https://docs.humio.com/docs/ingesting-data/data-shippers/fluentd/) for details.

Start `fluentd` in a Docker container using the `run.sh` script.

## Docker Compose

To have all the containers in Stan's Robot Shop use fluentd for logging, the `docker-compose.yaml` needs to be edited. Change the logging section at the top of the file.

```yaml
services:
  mongodb:
    build:
      context: mongo
    image: ${REPO}/rs-mongodb:${TAG}
    networks:
      - robto-shop
    logging: &logging
      driver: "fluentd"
      options:
        fluentd-address: localhost:24224
        tag: "{{.ImageName}}"
  redis:
```

If Robot Shop is already running, shut it down `docker-compose down`

Start Robot Shop with `docker-compose up -d`. It takes a few minutes to start, after that check with Humio or ELK for log entries.

Set up [logging integration](https://www.instana.com/docs/logging/) in Instana.

