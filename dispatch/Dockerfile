FROM golang:1.9.2

WORKDIR /opt/gorcv

ENV GOPATH=/opt/gorcv \
    GOBIN=/opt/gorcv/bin

# install external components
RUN go get \
    github.com/streadway/amqp \
    github.com/instana/golang-sensor

COPY src /opt/gorcv/

RUN go build && go install

CMD bin/gorcv

