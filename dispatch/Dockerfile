FROM golang:1.19 AS build

EXPOSE 8080

WORKDIR /go/src/app

COPY go.* ./
RUN go mod download

COPY *.go .
RUN go install

FROM debian:11-slim

COPY --from=build /go/bin/dispatch /usr/local/bin/dispatch
CMD dispatch
