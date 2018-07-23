FROM golang:1.9.2

ENV DEP_URL="https://github.com/golang/dep/releases/download/v0.4.1/dep-linux-amd64"
ENV GOPATH=/go

COPY src/ /go/src/github.com/instana/dispatch

WORKDIR /go/src/github.com/instana/dispatch

RUN curl -fsSL -o /usr/local/bin/dep ${DEP_URL} && \
	chmod +x /usr/local/bin/dep && \
    dep ensure && \
    go build -o bin/gorcv

# @todo stage this build

CMD bin/gorcv
