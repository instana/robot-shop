package main

import (
    "fmt"
    "log"
    "time"

    "github.com/streadway/amqp"
)

var amqpUri string = "amqp://guest:guest@rabbitmq:5672/"

var (
    rabbitConn *amqp.Connection
    rabbitChan *amqp.Channel
    rabbitCloseError chan *amqp.Error
    rabbitReady chan bool
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
            rabbitConn = connectToRabbitMQ(uri)
            rabbitCloseError = make(chan *amqp.Error)
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


func main() {
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
            msgs, err := rabbitChan.Consume("orders", "", false, false, false, false, nil)
            failOnError(err, "Failed to consume")

            for d := range msgs {
                log.Printf("Order %s\n", d.Body)
            }
        }
    }()

    log.Println("Waiting for messages")
    forever := make(chan bool)
    <-forever
}
