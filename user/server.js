/*jshint esversion: 6 */

const instana = require('@instana/collector');
// init tracing
// MUST be done before loading anything else!
instana({
    tracing: {
        enabled: true
    }
});

const mongoClient = require('mongodb').MongoClient;
const redis = require('redis');
const bodyParser = require('body-parser');
const express = require('express');
const pino = require('pino');
const expPino = require('express-pino-logger');

// MongoDB
var db;
var usersCollection;
var ordersCollection;
var mongoConnected = false;

const logger = pino({
    level: 'info',
    prettyPrint: false,
    useLevelLabels: true
});
const expLogger = expPino({
    logger: logger

});

const app = express();

app.use(expLogger);

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
        mongo: mongoConnected
    };
    res.json(stat);
});

// use REDIS INCR to track anonymous users
app.get('/uniqueid', (req, res) => {
    req.log.error('Unique ID test');
    // get number from Redis
    redisClient.incr('anonymous-counter', (err, r) => {
        if(!err) {
            res.json({
                uuid: 'anonymous-' + r
            });
        } else {
            req.log.error('ERROR', err);
            res.status(500).send(err);
        }
    });
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
            req.log.error('ERROR', e);
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
            req.log.info('user', user);
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
            req.log.error('ERROR', e);
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
                    req.log.info('inserted', r.result);
                    res.send('OK');
                }).catch((e) => {
                    req.log.error('ERROR', e);
                    res.status(500).send(e);
                });
            }
        }).catch((e) => {
            req.log.error('ERROR', e);
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

var redisHost;
var redisPassword;
var redisPort;

if (process.env.VCAP_SERVICES) {
    connectionDetails = null;

    console.log('Env var \'VCAP_SERVICES\' found, scanning for \'users_cache\' service binding');

    for (let [key, value] of Object.entries(JSON.parse(process.env.VCAP_SERVICES))) {
        try {
            binding = value.find(function(binding) {
                return 'users_cache' == binding.binding_name && binding.credentials;
            });

            if (!binding) {
                continue;
            }

            connectionDetails = binding.credentials;

            if (connectionDetails) {
                redisHost = connectionDetails.host;
                redisPassword = connectionDetails.password;
                redisPort = connectionDetails.port;

                console.log('Redis URI for \'users_cache\' service binding found in \'VCAP_SERVICES\'');

                break;
            }
        } catch (err) {
            console.log('Cannot process key \'' + key + '\' of \'VCAP_SERVICES\'', err);
            throw err;
        }
    }
} else if (process.env.REDIS_HOST) {
    redisHost = process.env.REDIS_HOST;
    redisPort = 6379;

    console.log('Redis host found in \'REDIS_HOST\': ' + redisHost);
} else {
    redisHost = 'redis';
    redisPort = 6379;

    console.log('Using default Redis host and port');
}

if (!redisHost) {
    throw new Error('Redis connection data missing');
}

// connect to Redis
var redisClient = redis.createClient({
    host: redisHost,
    password: redisPassword,
    port: redisPort
});

redisClient.on('error', (e) => {
    logger.error('Redis ERROR', e);
});
redisClient.on('ready', (r) => {
    logger.info('Redis READY', r);
});

// set up Mongo
function mongoConnect() {
    return new Promise((resolve, reject) => {
        var mongoURL;

        if (process.env.VCAP_SERVICES) {
            connectionDetails = null;

            console.log('Env var \'VCAP_SERVICES\' found, scanning for \'users_database\' service binding');

            for (let [key, value] of Object.entries(JSON.parse(process.env.VCAP_SERVICES))) {
                try {
                    binding = value.find(function(binding) {
                        return 'users_database' == binding.binding_name && binding.credentials;
                    });

                    if (!binding) {
                        continue;
                    }

                    connectionDetails = binding.credentials;

                    if (connectionDetails && connectionDetails.uri) {
                        mongoURL = connectionDetails.uri;

                        console.log('MongoDB URI for \'users_database\' service binding found in \'VCAP_SERVICES\'');

                        break;
                    } else {
                        throw new Error('Service binding \'users_database\' found, but cannot retrieve the URI from the credentials');
                    }
                } catch (err) {
                    console.log('Cannot process key \'' + key + '\' of \'VCAP_SERVICES\'', err);
                    throw err;
                }
            }
        } else if (process.env.MONGO_URL) {
            mongoURL = process.env.MONGO_URL;

            console.log('MongoDB URI found in \'MONGO_URL\': ' + mongoURL);
        } else {
            mongoURL = 'mongodb://mongodb:27017/catalogue';

            console.log('Using default MongoDB URI');
        }

        if (!mongoURL) {
            throw new Error('MongoDB connection data missing');
        }

        mongoClient.connect(mongoURL, (error, db) => {
            if (error) {
                throw error;
            }

            try {
                usersCollection = db.collection('users');
                ordersCollection = db.collection('orders');

                resolve('connected');
            } catch (err) {
                console.log('Cannot connecto to MongoDB databases', err);
                reject(err);
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

// fire it up!
const port = process.env.USER_SERVER_PORT || '8080';
app.listen(port, () => {
    logger.info('Started on port', port);
});

