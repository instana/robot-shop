package main

import (
    "fmt"
    "log"
    "time"
    "os"
    "math/rand"
    "strconv"

    "github.com/streadway/amqp"
    "github.com/instana/golang-sensor"
    ot "github.com/opentracing/opentracing-go"
    ext "github.com/opentracing/opentracing-go/ext"
    otlog "github.com/opentracing/opentracing-go/log"
)

const (
    Service = "Dispatch"
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

func createSpan(headers map[string]interface{}) {
    // headers is map[string]interface{}
    // carrier is map[string]string
    carrier := make(ot.TextMapCarrier)
    // convert by copying k, v
    for k, v := range headers {
        carrier[k] = v.(string)
    }

    // opentracing
    var span ot.Span
    tracer := ot.GlobalTracer()
    spanContext, err := tracer.Extract(ot.HTTPHeaders, carrier)
    if err == nil {
        log.Println("Creating span")
        // create span
        span = tracer.StartSpan("dispatch", ot.ChildOf(spanContext), ext.SpanKindConsumer)
        ext.MessageBusDestination.Set(span, "orders")
        ext.Component.Set(span, "dispatch")
        defer span.Finish()
        time.Sleep(time.Duration(42 + rand.Int63n(42)) * time.Millisecond)
        if rand.Intn(100) < errorPercent {
            span.SetTag("error", true)
            span.LogFields(
                otlog.String("error.kind", "Exception"),
                otlog.String("message", "Failed to dispatch to SOP"))
                log.Println("Span tagged with error")
        }
    } else {
        log.Println("Failed to get span context")
        log.Println(err)
    }
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
                go createSpan(d.Headers)
            }
        }
    }()

    log.Println("Waiting for messages")
    forever := make(chan bool)
    <-forever
}
