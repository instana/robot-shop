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

const port = process.env.CATALOGUE_SERVER_PORT || '8080';

// set up Mongo
function mongoConnectionPromise() {
    return new Promise(function() {
        var mongoURL;

        if (process.env.VCAP_SERVICES) {
            const bindingName = 'catalogue_database';

            connectionDetails = null;

            console.log('Env var \'VCAP_SERVICES\' found, scanning for \'catalogue_database\' service binding');

            for (let [key, value] of Object.entries(JSON.parse(process.env.VCAP_SERVICES))) {
                try {
                    connectionDetails = value.find(function(binding) {
                        return bindingName == binding.binding_name && binding.credentials;
                    }).credentials;
            
                    if (!connectionDetails) {
                        throw new Error(`Cannot find a service binding with name '${bindingName}'`);
                    }

                    const username = connectionDetails.username;
                    const password = connectionDetails.password;

                    const normalizedAuthDetails = `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;

                    mongoURL = connectionDetails.uri.replace(`${username}:${password}`, normalizedAuthDetails);
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

        return mongoClient.connect(mongoURL);
    })
    .then(function(db) {
        productsCollection = db.collection('products');

        db.on('close', function() {
            logger.error('Disconnected from the MongoDB database, reconnecting...', e);

            mongoConnect();
        })
    })
    .then(function() {
        logger.info('MongoDB connected');
    })
    .catch(function(err) {
        console.log(`Cannot connect to MongoDB: ${err}`);
    });
};

async function mongoConnect() {
    await mongoConnectionPromise();
}

mongoConnect();

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
    productsCollection.find({}).toArray().then((products) => {
        res.json(products);
    }).catch((e) => {
        req.log.error('ERROR', e);
        res.status(500).send(e);
    });
});

// product by SKU
app.get('/product/:sku', (req, res) => {
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
});

// products in a category
app.get('/products/:cat', (req, res) => {
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
});

// all categories
app.get('/categories', (req, res) => {
    productsCollection.distinct('categories').then((categories) => {
        res.json(categories);
    }).catch((e) => {
        req.log.error('ERROR', e);
        res.status(500).send(e);
    });
});

// search name and description
app.get('/search/:text', (req, res) => {
    productsCollection.find({ '$text': { '$search': req.params.text }}).toArray().then((hits) => {
        res.json(hits);
    }).catch((e) => {
        req.log.error('ERROR', e);
        res.status(500).send(e);
    });
});

// Fire up
app.listen(port, () => {
    logger.info('Started on port', port);
});
