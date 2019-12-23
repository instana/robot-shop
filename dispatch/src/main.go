package main

import (
    "fmt"
    "log"
    "time"
    "os"
    "math/rand"
    "strconv"
    "encoding/json"

    "github.com/streadway/amqp"
    "github.com/instana/go-sensor"
    ot "github.com/opentracing/opentracing-go"
    ext "github.com/opentracing/opentracing-go/ext"
    otlog "github.com/opentracing/opentracing-go/log"
)

const (
    Service = "dispatch"
)

var (
    amqpUri string
    rabbitChan *amqp.Channel
    rabbitCloseError chan *amqp.Error
    rabbitReady chan bool
    errorPercent int
)

func connectToRabbitMQ(uri string) *amqp.Connection {
    for {
        conn, err := amqp.Dial(uri)
        if err == nil {
            return conn
        }

        log.Println(err)
        log.Printf("Reconnecting to %s\n", uri)
        time.Sleep(1 * time.Second)
    }
}

func rabbitConnector(uri string) {
    var rabbitErr *amqp.Error

    for {
        rabbitErr = <-rabbitCloseError
        if rabbitErr != nil {
            log.Printf("Connecting to %s\n", amqpUri)
            rabbitConn := connectToRabbitMQ(uri)
            rabbitConn.NotifyClose(rabbitCloseError)

            var err error

            // create mappings here
            rabbitChan, err = rabbitConn.Channel()
            failOnError(err, "Failed to create channel")

            // create exchange
            err = rabbitChan.ExchangeDeclare("robot-shop", "direct", true, false, false, false, nil)
            failOnError(err, "Failed to create exchange")

            // create queue
            queue, err := rabbitChan.QueueDeclare("orders", true, false, false, false, nil)
            failOnError(err, "Failed to create queue")

            // bind queue to exchange
            err = rabbitChan.QueueBind(queue.Name, "orders", "robot-shop", false, nil)
            failOnError(err, "Failed to bind queue")

            // signal ready
            rabbitReady <- true
        }
    }
}

func failOnError(err error, msg string) {
    if err != nil {
        log.Fatalf("$s : %s", msg, err)
        panic(fmt.Sprintf("%s : %s", msg, err))
    }
}

func getOrderId(order []byte) string {
    id := "unknown"
    var f interface{}
    err := json.Unmarshal(order, &f)
    if err == nil {
        m := f.(map[string]interface{})
        id = m["orderid"].(string)
    }

    return id
}

func createSpan(headers map[string]interface{}, order string) {
    // headers is map[string]interface{}
    // carrier is map[string]string
    carrier := make(ot.TextMapCarrier)
    // convert by copying k, v
    for k, v := range headers {
        carrier[k] = v.(string)
    }

    // get the order id
    log.Printf("order %s\n", order)

    // opentracing
    var span ot.Span
    tracer := ot.GlobalTracer()
    spanContext, err := tracer.Extract(ot.HTTPHeaders, carrier)
    if err == nil {
        log.Println("Creating child span")
        // create child span
        span = tracer.StartSpan("getOrder", ot.ChildOf(spanContext))
    } else {
        log.Println(err)
        log.Println("Failed to get context from headers")
        log.Println("Creating root span")
        // create root span
        span = tracer.StartSpan("getOrder")
    }

    span.SetTag(string(ext.SpanKind), ext.SpanKindConsumerEnum)
    span.SetTag(string(ext.MessageBusDestination), "robot-shop")
    span.SetTag("exchange", "robot-shop")
    span.SetTag("sort", "consume")
    span.SetTag("address", "rabbitmq")
    span.SetTag("key", "orders")
    span.LogFields(otlog.String("orderid", order))
    defer span.Finish()

    time.Sleep(time.Duration(42 + rand.Int63n(42)) * time.Millisecond)
    if rand.Intn(100) < errorPercent {
        span.SetTag("error", true)
        span.LogFields(
            otlog.String("error.kind", "Exception"),
            otlog.String("message", "Failed to dispatch to SOP"))
        log.Println("Span tagged with error")
    }

    processSale(span)
}

func processSale(parentSpan ot.Span) {
    tracer := ot.GlobalTracer()
    span := tracer.StartSpan("processSale", ot.ChildOf(parentSpan.Context()))
    defer span.Finish()
    span.SetTag(string(ext.SpanKind), "intermediate")
    span.LogFields(otlog.String("info", "Order sent for processing"))
    time.Sleep(time.Duration(42 + rand.Int63n(42)) * time.Millisecond)
}


func main() {
    // Instana tracing
    ot.InitGlobalTracer(instana.NewTracerWithOptions(&instana.Options{
        Service: Service,
        LogLevel: instana.Info}))

    // Init amqpUri
    // get host from environment
    amqpHost, ok := os.LookupEnv("AMQP_HOST")
    if !ok {
        amqpHost = "rabbitmq"
    }
    amqpUri = fmt.Sprintf("amqp://guest:guest@%s:5672/", amqpHost)

    // get error threshold from environment
    errorPercent = 0
    epct, ok := os.LookupEnv("DISPATCH_ERROR_PERCENT")
    if ok {
        epcti, err := strconv.Atoi(epct)
        if err == nil {
            if epcti > 100 {
                epcti = 100
            }
            if epcti < 0 {
                epcti = 0
            }
            errorPercent = epcti
        }
    }
    log.Printf("Error Percent is %d\n", errorPercent)

    // MQ error channel
    rabbitCloseError = make(chan *amqp.Error)

    // MQ ready channel
    rabbitReady = make(chan bool)

    go rabbitConnector(amqpUri)

    rabbitCloseError <- amqp.ErrClosed

    go func() {
        for {
            // wait for rabbit to be ready
            ready := <-rabbitReady
            log.Printf("Rabbit MQ ready %v\n", ready)

            // subscribe to bound queue
            msgs, err := rabbitChan.Consume("orders", "", true, false, false, false, nil)
            failOnError(err, "Failed to consume")

            for d := range msgs {
                log.Printf("Order %s\n", d.Body)
                log.Printf("Headers %v\n", d.Headers)
                id := getOrderId(d.Body)
                go createSpan(d.Headers, id)
            }
        }
    }()

    log.Println("Waiting for messages")
    forever := make(chan bool)
    <-forever
}
