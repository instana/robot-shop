FROM golang:1.17

WORKDIR /go/src/app

COPY * .

RUN go mod tidy && go get
RUN go install

CMD dispatch
