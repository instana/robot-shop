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
const bodyParser = require('body-parser');
const express = require('express');
const pino = require('pino');
const expPino = require('express-pino-logger');

const logger = pino({
    level: 'info',
    prettyPrint: false,
    useLevelLabels: true
});
const expLogger = expPino({
    logger: logger
});

// MongoDB
var productsCollection;
var mongoConnected = false;

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

// all products
app.get('/products', (req, res) => {
    if(mongoConnected) {
        productsCollection.find({}).toArray().then((products) => {
            res.json(products);
        }).catch((e) => {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not avaiable');
    }
});

// product by SKU
app.get('/product/:sku', (req, res) => {
    if(mongoConnected) {
        productsCollection.findOne({sku: req.params.sku}).then((product) => {
            req.log.info('product', product);
            if(product) {
                res.json(product);
            } else {
                res.status(404).send('SKU not found');
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

// products in a category
app.get('/products/:cat', (req, res) => {
    if(mongoConnected) {
        productsCollection.find({ categories: req.params.cat }).sort({ name: 1 }).toArray().then((products) => {
            if(products) {
                res.json(products);
            } else {
                res.status(404).send('No products for ' + req.params.cat);
            }
        }).catch((e) => {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not avaiable');
    }
});

// all categories
app.get('/categories', (req, res) => {
    if(mongoConnected) {
        productsCollection.distinct('categories').then((categories) => {
            res.json(categories);
        }).catch((e) => {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// search name and description
app.get('/search/:text', (req, res) => {
    if(mongoConnected) {
        productsCollection.find({ '$text': { '$search': req.params.text }}).toArray().then((hits) => {
            res.json(hits);
        }).catch((e) => {
            req.log.error('ERROR', e);
            res.status(500).send(e);
        });
    } else {
        req.log.error('database not available');
        res.status(500).send('database not available');
    }
});

// set up Mongo
function mongoConnect() {
    return new Promise((resolve, reject) => {
        var mongoURL;

        if (process.env.VCAP_SERVICES) {
            connectionDetails = null;

            console.log('Env var \'VCAP_SERVICES\' found, scanning for \'catalogue_database\' service binding');

            for (let [key, value] of Object.entries(JSON.parse(process.env.VCAP_SERVICES))) {
                try {
                    binding = value.find(function(binding) {
                        return 'catalogue_database' == binding.binding_name && binding.credentials;
                    });

                    if (!binding) {
                        continue;
                    }

                    connectionDetails = binding.credentials;

                    if (connectionDetails) {
                        mongoURL = connectionDetails.uri;

                        console.log('MongoDB URI for \'catalogue_database\' service binding found in \'VCAP_SERVICES\'');

                        break;
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
            if(error) {
                reject(error);
            } else {
                productsCollection = db.collection('products');
                resolve('connected');
            }
        });
    });
}

// mongodb connection retry loop
function mongoLoop() {
    mongoConnect().then((r) => {
        mongoConnected = true;
        logger.info('MongoDB connected');
    }).catch((e) => {
        logger.error('An error occurred', e);
        setTimeout(mongoLoop, 2000);
    });
}

mongoLoop();

// fire it up!
const port = process.env.CATALOGUE_SERVER_PORT || '8080';
app.listen(port, () => {
    logger.info('Started on port', port);
});

