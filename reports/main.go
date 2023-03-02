package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"os"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/push"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	version       = "unknown"
	pusher        *push.Pusher
	mongodbClient *mongo.Client
	mongodbReady  chan bool
	redisClient   *redis.Client
	connCtx       context.Context
	redisReady    chan bool
)

var methodDurationHistogram = prometheus.NewHistogramVec(
	prometheus.HistogramOpts{
		Name:    "go_method_timed_seconds",
		Help:    "histogram",
		Buckets: []float64{0.005, 0.01, 0.025, 0.05, 0.075, 0.1, 0.25, 0.5, 0.75, 1, 2.5, 5, 7.5, 10},
	},
	[]string{"method"},
)

// uri - mongodb://user:pass@host:port
func connectToMongo(uri string) *mongo.Client {
	log.Println("Connecting to", uri)
	for {
		client, err := mongo.Connect(connCtx, options.Client().ApplyURI(uri))
		if err == nil {
			log.Println("connected to", uri)
			return client
		}

		log.Println(err)
		log.Printf("Reconnecting to %s\n", uri)
		time.Sleep(2 * time.Second)
	}
}

func connectToRedis(uri string) *redis.Client {
	log.Println("Connecting to", uri)

	rds := redis.NewClient(&redis.Options{
		Addr:     uri,
		Password: "",
		DB:       0, // default
	})
	// test connection
	for {
		stat := rds.Ping(connCtx)
		if stat.Err() != nil {
			log.Println(stat.Err())
			log.Println("Reconnecting to", uri)
			time.Sleep(2 * time.Second)
		} else {
			log.Println("connected to", uri)
			break
		}
	}

	return rds
}

func processCart(cart string) (count int, value float64, err error) {
	var data map[string]interface{}
	err = json.Unmarshal([]byte(cart), &data)
	if err != nil {
		log.Println("json error:", err)
		return
	}

	items := data["items"].([]interface{})
	count = len(items)
	value = data["total"].(float64)

	return
}

func generateReport() {
	start := time.Now()
	var totalItems int64
	var totalValue float64

	// wait for backends to be ready
	rr := <-redisReady
	mr := <-mongodbReady
	log.Println("Redis ready", rr)
	log.Println("MongoDB ready", mr)

	// what is currently in users carts
	var cursor uint64
	for {
		var keys []string
		var err error

		keys, cursor, err = redisClient.Scan(connCtx, cursor, "*", 10).Result()
		if err != nil {
			log.Println("Redis error:", err)
			break
		}
		for _, key := range keys {
			log.Println("key:", key)
			if key != "anonymous-counter" {
				stat := redisClient.Get(connCtx, key)
				if stat.Err() != nil {
					log.Println("Redis error:", stat.Err())
					continue
				}
				cart, err := stat.Result()
				if err != nil {
					log.Println("Redis error:", stat.Err())
					continue
				}
				log.Println("cart", cart)
				if count, value, err := processCart(cart); err != nil {
					log.Println("cart error:", err)
					continue
				} else {
					totalItems += int64(count)
					totalValue += value
				}

			}
		}
		if cursor == 0 {
			// no more
			break
		}
	}

	// orders completed since the last run
	coll := mongodbClient.Database("orders").Collection("orders")
	filter := bson.D{}
	dbcursor, err := coll.Find(connCtx, filter)
	if err != nil {
		log.Println("MongoDB error:", err)
		return
	}
	// loop through orders
	for dbcursor.Next(connCtx) {
		var order map[string]interface{}
		err := dbcursor.Decode(&order)
		if err != nil {
			log.Println("MongoDB error:", err)
			continue
		}
		log.Println("order", order["orderid"])
		doc, err := json.Marshal(order["cart"])
		if err != nil {
			log.Println("JSON error:", err)
			continue
		}
		if count, value, err := processCart(string(doc)); err != nil {
			log.Println("cart error:", err)
			continue
		} else {
			totalItems += int64(count)
			totalValue += value
		}
	}

	// delete old orders to stop database exploding
	if res, err := coll.DeleteMany(connCtx, filter); err != nil {
		log.Println("MongoDB delete error:", err)
	} else {
		log.Printf("Deleted %v old orders", res.DeletedCount)
	}

	duration := time.Since(start)
	methodDurationHistogram.WithLabelValues("runReport").Observe(duration.Seconds())
}

func init() {
	pusher = push.New("http://pushgateway:9091", "reports").Gatherer(prometheus.DefaultGatherer)

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

func main() {
	log.Println("version", version)
	rand.Seed(time.Now().Unix())

	mongodbReady = make(chan bool)
	redisReady = make(chan bool)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	connCtx = ctx

	mongodbHost, ok := os.LookupEnv("MONGO_HOST")
	if !ok {
		mongodbHost = "mongodb"
	}
	mongodbUri := fmt.Sprintf("mongodb://%s:27017", mongodbHost)
	go func() {
		mongodbClient = connectToMongo(mongodbUri)
		mongodbReady <- true
	}()

	redisHost, ok := os.LookupEnv("REDIS_HOST")
	if !ok {
		redisHost = "redis"
	}
	redisUri := fmt.Sprintf("%s:6379", redisHost)
	go func() {
		redisClient = connectToRedis(redisUri)
		redisReady <- true
	}()

	// get error threshold from environment
	var errorPercent int
	epct, ok := os.LookupEnv("REPORTS_ERROR_PERCENT")
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

	// generate the reports
	generateReport()
	if err := pusher.Add(); err != nil {
		log.Println("Failed to push metrics", err)
	}

	if errorPercent > 0 && rand.Intn(100) < errorPercent {
		// TODO - better error message
		log.Fatal("Crashing out")
	}
}
