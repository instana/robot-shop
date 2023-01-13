FROM golang:1.19

EXPOSE 8080

WORKDIR /go/src/app

COPY go.* ./
RUN go mod download

COPY *.go .

RUN go install

CMD dispatch
