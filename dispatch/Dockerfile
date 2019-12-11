FROM golang:1.12.7

ENV GOPATH=/go

RUN apt-get update && apt-get install -y go-dep

WORKDIR /go/src/github.com/instana/dispatch

COPY src/ /go/src/github.com/instana/dispatch

RUN dep init && dep ensure
RUN go build -o bin/gorcv

# TODO stage this build

CMD bin/gorcv
