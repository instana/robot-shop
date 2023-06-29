const fs = require('fs');
const mongoClient = require('mongodb').MongoClient;
const mongoObjectID = require('mongodb').ObjectID;
const redis = require('redis');
const bodyParser = require('body-parser');
const express = require('express');
const promMid = require('express-prometheus-middleware');
const pino = require('pino');
const expPino = require('express-pino-logger');

// MongoDB
var db;
var usersCollection;
var ordersCollection;
var mongoConnected = false;

// Redis
var redisHost = process.env.REDIS_HOST || 'redis';
var redisConnected = false;

const logger = pino({
    level: 'warn',
    prettyPrint: false,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    }
});
const expLogger = expPino({
    logger: logger
});

const app = express();

app.use(expLogger);


app.use(promMid({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 1.5],
    requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
    responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
    /**
     * Uncomenting the `authenticate` callback will make the `metricsPath` route
     * require authentication. This authentication callback can make a simple
     * basic auth test, or even query a remote server to validate access.
     * To access /metrics you could do:
     * curl -X GET user:password@localhost:9091/metrics
     */
    // authenticate: req => req.headers.authorization === 'Basic dXNlcjpwYXNzd29yZA==',
    /**
     * Uncommenting the `extraMasks` config will use the list of regexes to
     * reformat URL path names and replace the values found with a placeholder value
    */
    extraMasks: ['^(anonymous|partner).[0-9]+$'],
    /**
     * The prefix option will cause all metrics to have the given prefix.
     * E.g.: `app_prefix_http_requests_total`
     */
    // prefix: 'app_prefix_',
    /**
     * Can add custom labels with customLabels and transformLabels options
     */
    // customLabels: ['contentType'],
    // transformLabels(labels, req) {
    //   // eslint-disable-next-line no-param-reassign
    //   labels.contentType = req.headers['content-type'];
    // },
  }));

app.use((req, res, next) => {
    res.set('Timing-Allow-Origin', '*');
    res.set('Access-Control-Allow-Origin', '*');
    next();
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/health', (req, res) => {
    var stat = {
        app: 'OK',
        mongo: mongoConnected,
        redis: redisConnected
    };
    res.json(stat);
});

app.get('/ready', (req, res) => {
    if(mongoConnected && redisConnected) {
        res.send('ready');
    } else {
        res.status(404).send('not ready');
    }
});

// use REDIS INCR to track anonymous users
app.get('/uniqueid', (req, res) => {
    // get number from Redis
    if(redisConnected) {
        redisClient.incr('anonymous-counter').then((val) => {
            res.json({
                uuid: 'anonymous-' + val
            });
        }).catch((err) => {
            req.log.error(err);
            res.ststus(500).send(err);
        });
    } else {
        req.log.error('Redis not available');
        res.status(500).send('Redis not available');
    }
});

// check user exists
app.get('/check/:id', (req, res) => {
    if(mongoConnected) {
        usersCollection.findOne({name: req.params.id}).then((user) => {
            if(user) {
                res.send('OK');
            } else {
                res.status(404).send('user not found');
            }
        }).catch((e) => {
            req.log.error(e);
            res.send(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// return all users for debugging only
app.get('/users', (req, res) => {
    if(mongoConnected) {
        usersCollection.find().toArray().then((users) => {
            res.json(users);
        }).catch((e) => {
            req.log.error(e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

app.post('/login', (req, res) => {
    req.log.info('login', req.body);
    if(req.body.name === undefined || req.body.password === undefined) {
        req.log.warn('credentails not complete');
        res.status(400).send('name or passowrd not supplied');
    } else if(mongoConnected) {
        usersCollection.findOne({
            name: req.body.name,
        }).then((user) => {
            req.log.info('user %o', user);
            if(user) {
                if(user.password == req.body.password) {
                    res.json(user);
                } else {
                    res.status(404).send('incorrect password');
                }
            } else {
                res.status(404).send('name not found');
            }
        }).catch((e) => {
            req.log.error(e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// TODO - validate email address format
app.post('/register', (req, res) => {
    req.log.info('register', req.body);
    if(req.body.name === undefined || req.body.password === undefined || req.body.email === undefined) {
        req.log.warn('insufficient data');
        res.status(400).send('insufficient data');
    } else if(mongoConnected) {
        // check if name already exists
        usersCollection.findOne({name: req.body.name}).then((user) => {
            if(user) {
                req.log.warn('user already exists');
                res.status(400).send('name already exists');
            } else {
                // create new user
                usersCollection.insertOne({
                    name: req.body.name,
                    password: req.body.password,
                    email: req.body.email
                }).then((r) => {
                    req.log.info('inserted %o', r.result);
                    res.send('OK');
                }).catch((e) => {
                    req.log.error(e);
                    res.status(500).send(e);
                });
            }
        }).catch((e) => {
            req.log.error(e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

app.post('/order/:id', (req, res) => {
    req.log.info('order', req.body);
    // only for registered users
    if(mongoConnected) {
        usersCollection.findOne({
            name: req.params.id
        }).then((user) => {
            if(user) {
                // found user record
                // get orders
                ordersCollection.findOne({
                    name: req.params.id
                }).then((history) => {
                    if(history) {
                        var list = history.history;
                        list.push(req.body);
                        ordersCollection.updateOne(
                            { name: req.params.id },
                            { $set: { history: list }}
                        ).then((r) => {
                            res.send('OK');
                        }).catch((e) => {
                            req.log.error(e);
                            res.status(500).send(e);
                        });
                    } else {
                        // no history
                        ordersCollection.insertOne({
                            name: req.params.id,
                            history: [ req.body ]
                        }).then((r) => {
                            res.send('OK');
                        }).catch((e) => {
                            req.log.error(e);
                            res.status(500).send(e);
                        });
                    }
                }).catch((e) => {
                    req.log.error(e);
                    res.status(500).send(e);
                });
            } else {
                res.status(404).send('name not found');
            }
        }).catch((e) => {
            req.log.error(e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

app.get('/history/:id', (req, res) => {
    if(mongoConnected) {
        ordersCollection.findOne({
            name: req.params.id
        }).then((history) => {
            if(history) {
                res.json(history);
            } else {
                res.status(404).send('history not found');
            }
        }).catch((e) => {
            req.log.error(e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// connect to Redis
logger.info('connecting to redis host %s', redisHost);
var redisClient = redis.createClient({
    url: 'redis://' + redisHost
});

redisClient.on('error', (e) => {
    logger.error('Redis ERROR %o', e);
});
redisClient.on('ready', () => {
    redisConnected = true;
    logger.info('Redis READY');
});

redisClient.connect();

// set up Mongo
function mongoConnect() {
    return new Promise((resolve, reject) => {
        var mongoURL = process.env.MONGO_URL || 'mongodb://mongodb:27017/users';
        mongoClient.connect(mongoURL, (error, client) => {
            if(error) {
                reject(error);
            } else {
                db = client.db('users');
                usersCollection = db.collection('users');
                ordersCollection = db.collection('orders');
                resolve('connected');
            }
        });
    });
}

function mongoLoop() {
    mongoConnect().then((r) => {
        mongoConnected = true;
        logger.info('MongoDB connected');
    }).catch((e) => {
        logger.error('ERROR', e);
        setTimeout(mongoLoop, 2000);
    });
}

mongoLoop();

function getData() {
    return new Promise((resolve, reject) => {
        let size = 1024 * 1024;
        fs.open('/dev/urandom', 'r', (err, fd) => {
            if (err) {
                reject(err);
            }
            let buffer = Buffer.alloc(size);
            fs.read(fd, buffer, 0, size, 0, (err, num) => {
                if (err) {
                    reject(err);
                } else {
                    fs.close(fd);
                    resolve(buffer);
                }
            });
        });
    });    
}

function randRange(min, max) {
    return (Math.random() * (max - min)) + min;
}

var hog = [];
function memoryHog() {
    if (randRange(1, 100) < 10 && hog.length < 40) {
        for (let i = 0; i < 10; i++) {
            getData().then((b) => {
                hog.push(b);
                console.log(`hog pushed ${hog.length}`);
            }).catch((err) => {
                console.log(err.message);
            })
        }
    }

    if (randRange(1, 100) < 10 && hog.length >= 40) {
        console.log('free the hog');
        hog = [];
    }
    setTimeout(memoryHog, 1000);
}

setTimeout(memoryHog, 5000);

// fire it up!
const port = process.env.USER_SERVER_PORT || '8080';
app.listen(port, () => {
    logger.info('Started on port %s', port);
});

