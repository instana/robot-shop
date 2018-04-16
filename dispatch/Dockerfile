FROM golang:1.9.2

WORKDIR /opt/gorcv

ENV GOPATH=/opt/gorcv \
    GOBIN=/opt/gorcv/bin \
    AMQP_URI=rabbitmq

# install external components
# @todo godep
RUN go get \
    github.com/streadway/amqp \
    github.com/instana/golang-sensor

COPY src /opt/gorcv/

RUN go build && go install

# @todo stage this build

CMD bin/gorcv

