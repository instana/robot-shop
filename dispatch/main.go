package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/streadway/amqp"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	version          = "unknown"
	rabbitChan       *amqp.Channel
	rabbitCloseError chan *amqp.Error
	rabbitReady      chan bool
	mongodbClient    *mongo.Client
	errorPercent     int
)

var methodDurationHistogram = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "go_method_timed_seconds",
		Help:    "histogram",
		Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10},
	},
	[]string{"method"},
)

func init() {
	prometheus.MustRegister(methodDurationHistogram)

	g := prometheus.NewGauge(prometheus.GaugeOpts{
		Name: "version_info",
		ConstLabels: prometheus.Labels{
			"version": version,
		},
	})
	g.Set(1)

	prometheus.MustRegister(g)
}

// uri - mongodb://user:pass@host:port
func connectToMongo(uri string) *mongo.Client {
	log.Println("Connecting to", uri)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	for {
		client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
		if err == nil {
			return client
		}

		log.Println(err)
		log.Printf("Reconnecting to %s\n", uri)
		time.Sleep(2 * time.Second)
	}
}

func connectToRabbitMQ(uri string) *amqp.Connection {
	for {
		conn, err := amqp.Dial(uri)
		if err == nil {
			return conn
		}

		log.Println(err)
		log.Printf("Reconnecting to %s\n", uri)
		time.Sleep(2 * time.Second)
	}
}

func rabbitConnector(uri string) {
	var rabbitErr *amqp.Error

	for {
		rabbitErr = <-rabbitCloseError
		if rabbitErr == nil {
			return
		}

		log.Printf("Connecting to %s\n", uri)
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

func failOnError(err error, msg string) {
	if err != nil {
		log.Fatalf("%s : %s", msg, err)
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

func processOrder(headers map[string]interface{}, order []byte) {
	start := time.Now()
	log.Printf("processing order %s\n", order)

	if mongodbClient != nil {
		// parse string to json
		var o map[string]interface{}
		err := json.Unmarshal(order, &o)
		if err != nil {
			log.Println("error parsing order", err)
			return
		}
		// add _id field
		o["_id"] = o["orderid"]

		// save the order
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		coll := mongodbClient.Database("orders").Collection("orders")
		res, err := coll.InsertOne(ctx, o)
		if err == nil {
			log.Println("insert result", res.InsertedID)
		} else {
			log.Println("insertion error", err)
		}
	}

	// add a little extra time
	time.Sleep(time.Duration(42+rand.Int63n(42)) * time.Millisecond)
	duration := time.Since(start)
	methodDurationHistogram.WithLabelValues("processOrder").Observe(duration.Seconds())

	// crash out for Crash Loop Assertion
	if errorPercent > 0 && rand.Intn(100) < errorPercent {
		// TODO - better message text
		log.Fatal("crashing out")
	}
}

func main() {
	log.Println("Version", version)
	rand.Seed(time.Now().Unix())

	// Init amqpUri
	// get host from environment
	amqpHost, ok := os.LookupEnv("AMQP_HOST")
	if !ok {
		amqpHost = "rabbitmq"
	}
	amqpUri := fmt.Sprintf("amqp://guest:guest@%s:5672/", amqpHost)

	mongodbHost, ok := os.LookupEnv("MONGO_HOST")
	if !ok {
		mongodbHost = "mongodb"
	}
	mongodbUri := fmt.Sprintf("mongodb://%s:27017", mongodbHost)

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

	// MongoDB connection
	go func() {
		mongodbClient = connectToMongo(mongodbUri)
	}()

	go func() {
		for {
			// wait for rabbit to be ready
			ready := <-rabbitReady
			log.Printf("Rabbit MQ ready %v\n", ready)

			// subscribe to bound queue
			msgs, err := rabbitChan.Consume("orders", "", true, false, false, false, nil)
			failOnError(err, "Failed to consume")

			for d := range msgs {
				log.Printf("Headers %v\n", d.Headers)
				go processOrder(d.Headers, d.Body)
			}
		}
	}()

	http.Handle("/metrics", promhttp.Handler())
	panic(http.ListenAndServe(":8080", nil))
}
