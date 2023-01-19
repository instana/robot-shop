FROM golang:1.19 AS build

ARG VERSION
WORKDIR /build

COPY go.* ./
RUN go mod download

COPY *.go ./
RUN CGO_ENABLED=1 go build -a -installsuffix cgo -ldflags "-X main.version=$VERSION" -o reports

FROM debian:11-slim

EXPOSE 8080

COPY --from=build /build/reports /usr/local/bin/reports
CMD reports
