const instana = require('instana-nodejs-sensor');
const mongoClient = require('mongodb').MongoClient;
const mongoObjectID = require('mongodb').ObjectID;
const redis = require('redis');
const bodyParser = require('body-parser');
const express = require('express');

// MongoDB
var db;
var collection;
var mongoConnected = false;

// init tracing
instana({
    tracing: {
        enabled: true
    }
});


const app = express();

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
    // get number from Redis
    redisClient.incr('user', (err, r) => {
        if(!err) {
            res.json({
                uuid: 'anonymous-' + r
            });
        }
    });
});

// return all users for debugging only
app.get('/users', (req, res) => {
    if(mongoConnected) {
        collection.find().toArray().then((users) => {
            res.json(users);
        }).catch((e) => {
            console.log('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not available');
    }
});

app.post('/login', (req, res) => {
    console.log('login', req.body);
    if(req.body.name === undefined || req.body.password === undefined) {
        res.status(400).send('name or passowrd not supplied');
    } else if(mongoConnected) {
        collection.findOne({
            name: req.body.name,
        }).then((user) => {
            console.log('user', user);
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
            console.log('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not available');
    }
});

// TODO - validate email address format
app.post('/register', (req, res) => {
    console.log('register', req.body);
    if(req.body.name === undefined || req.body.password === undefined || req.body.email === undefined) {
        res.status(400).send('insufficient data');
    } else if(mongoConnected) {
        // check if name already exists
        collection.findOne({name: req.body.name}).then((user) => {
            if(user) {
                res.status(400).send('name already exists');
            } else {
                // create new user
                collection.insertOne({
                    name: req.body.name,
                    password: req.body.password,
                    email: req.body.email
                }).then((r) => {
                    console.log('inserted', r.result);
                    res.send('OK');
                }).catch((e) => {
                    console.log('ERROR', e);
                    res.status(500).send(e);
                });
            }
        }).catch((e) => {
            console.log('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        res.status(500).send('database not available');
    }
});

// connect to Redis
var redisClient = redis.createClient({
    host: 'redis'
});

redisClient.on('error', (e) => {
    console.log('Redis ERROR', e);
});
redisClient.on('ready', (r) => {
    console.log('Redis READY', r);
});

// set up Mongo
function mongoConnect() {
    return new Promise((resolve, reject) => {
    var mongoURL = process.env.MONGO_URL || 'mongodb://mongodb:27017/users';
    mongoClient.connect(mongoURL, (error, _db) => {
        if(error) {
            reject(error);
        } else {
            db = _db;
            collection = db.collection('users');
            resolve('connected');
        }
    });
});
}

function mongoLoop() {
    mongoConnect().then((r) => {
        mongoConnected = true;
        console.log('MongoDB connected');
    }).catch((e) => {
        console.error('ERROR', e);
        setTimeout(mongoLoop, 2000);
    });
}

mongoLoop();

// fire it up!
const port = process.env.USER_SERVER_PORT || '8080';
app.listen(port, () => {
    console.log('Started on port', port);
});
