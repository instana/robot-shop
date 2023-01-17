package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var (
	version       = "unknown"
	mongodbClient *mongo.Client
	redisClient   *redis.Client
	redisCtx      context.Context
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
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	for {
		client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
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
		Addr: uri,
	})

	return rds
}

func generateReport() {

}

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

func main() {
	log.Println("version", version)

	mongodbHost, ok := os.LookupEnv("MONGO_HOST")
	if !ok {
		mongodbHost = "mongodb"
	}
	mongodbUri := fmt.Sprintf("mongodb://%s:27017", mongodbHost)
	go func() {
		mongodbClient = connectToMongo(mongodbUri)
	}()

	redisHost, ok := os.LookupEnv("REDIS_HOST")
	if !ok {
		redisHost = "redis"
	}
	redisUri := fmt.Sprintf("%s:6379", redisHost)
	go func() {
		redisClient = connectToRedis(redisUri)
	}()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	redisCtx = ctx

	http.Handle("/metrics", promhttp.Handler())
	panic(http.ListenAndServe(":8080", nil))
}
