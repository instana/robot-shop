FROM debian:10

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y default-mysql-client

WORKDIR /data
COPY scripts ./

ENTRYPOINT [ "/data/entrypoint.sh" ]
