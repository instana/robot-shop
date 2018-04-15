const instana = require('instana-nodejs-sensor');
// init tracing
// MUST be done before loading anything else!
instana({
    tracing: {
        enabled: true
    }
});

const redis = require('redis');
const request = require('request');
const bodyParser = require('body-parser');
const express = require('express');

var redisConnected = false;

var redisHost = process.env.REDIS_HOST || 'redis'
var catalogueHost = process.env.CATALOGUE_HOST || 'catalogue'

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
        redis: redisConnected
    };
    res.json(stat);
});


// get cart with id
app.get('/cart/:id', (req, res) => {
    redisClient.get(req.params.id, (err, data) => {
        if(err) {
            console.log('ERROR', err);
            res.status(500).send(err);
        } else {
            if(data == null) {
                res.status(404).send('cart not found');
            } else {
                res.set('Content-Type', 'application/json');
                res.send(data);
            }
        }
    });
});

// delete cart with id
app.delete('/cart/:id', (req, res) => {
    redisClient.del(req.params.id, (err, data) => {
        if(err) {
            console.log('ERROR', err);
            res.status(500).send(err);
        } else {
            if(data == 1) {
                res.send('OK');
            } else {
                res.status(404).send('cart not found');
            }
        }
    });
});

// rename cart i.e. at login
app.get('/rename/:from/:to', (req, res) => {
    redisClient.get(req.params.from, (err, data) => {
        if(err) {
            console.log('ERROR', err);
            res.status(500).send(err);
        } else {
            if(data == null) {
                res.status(404).send('cart not found');
            } else {
                var cart = JSON.parse(data);
                saveCart(req.params.to, cart);
                res.json(cart);
            }
        }
    });
});

// update/create cart
app.get('/add/:id/:sku/:qty', (req, res) => {
    // check quantity
    var qty = parseInt(req.params.qty);
    if(isNaN(qty)) {
        res.status(400).send('quantity must be a number');
        return;
    } else if(qty < 1) {
        res.status(400).send('negative quantity not allowed');
        return;
    }

    // look up product details
    getProduct(req.params.sku).then((product) => {
        console.log('got product', product);
        // is the product in stock?
        if(product.instock == 0) {
            res.status(404).send('out of stock');
            return;
        }
        // does the cart already exist?
        redisClient.get(req.params.id, (err, data) => {
            if(err) {
                console.log('ERROR', err);
                res.status(500).send(err);
            } else {
                var cart;
                if(data == null) {
                    // create new cart
                    cart = {
                        total: 0,
                        tax: 0,
                        items: []
                    };
                } else {
                    cart = JSON.parse(data);
                }
                console.log('got cart', cart);
                // add sku to cart
                var item = {
                    qty: qty,
                    sku: req.params.sku,
                    name: product.name,
                    price: product.price,
                    subtotal: qty * product.price
                };
                var list = mergeList(cart.items, item, qty);
                cart.items = list;
                cart.total = calcTotal(cart.items);
                // work out tax
                cart.tax = calcTax(cart.total);

                // save the new cart
                saveCart(req.params.id, cart);
                res.json(cart);
            }
        });
    }).catch((err) => {
        res.status(500).send(err);
    });
});

// update quantity - remove item when qty == 0
app.get('/update/:id/:sku/:qty', (req, res) => {
    // check quantity
    var qty = parseInt(req.params.qty);
    if(isNaN(qty)) {
        res.status(400).send('quantity must be a number');
        return;
    }

    // get the cart
    redisClient.get(req.params.id, (err, data) => {
        if(err) {
            console.log('ERROR', err);
            res.status(500).send(err);
        } else {
            if(data == null) {
                res.status(404).send('cart not found');
            } else {
                var cart = JSON.parse(data);
                var idx;
                var len = cart.items.length;
                for(idx = 0; idx < len; idx++) {
                    if(cart.items[idx].sku == req.params.sku) {
                        break;
                    }
                }
                if(idx == len) {
                    // not in list
                    res.status(404).send('not in cart');
                } else {
                    if(qty == 0) {
                        cart.items.splice(idx, 1);
                    } else {
                        cart.items[idx].qty = qty;
                        cart.items[idx].subtotal = cart.items[idx].price * qty;
                    }
                    cart.total = calcTotal(cart.items);
                    // work out tax
                    cart.tax = calcTax(cart.total);
                    saveCart(req.params.id, cart);
                    res.json(cart);
                }
            }
        }
    });
});

// add shipping
app.post('/shipping/:id', (req, res) => {
    var shipping = req.body;
    if(shipping.distance === undefined || shipping.cost === undefined || shipping.location == undefined) {
        console.log('bad shipping data', shipping);
        res.status(400).send('shipping data missing');
    } else {
        // get the cart
        redisClient.get(req.params.id, (err, data) => {
            if(err) {
                console.log('ERROR', err);
                res.status(500).send(err);
            } else {
                if(data == null) {
                    console.log('no cart for', req.params.id);
                    res.status(404).send('cart not found');
                } else {
                    var cart = JSON.parse(data);
                    var item = {
                        qty: 1,
                        sku: 'SHIP',
                        name: 'shipping to ' + shipping.location,
                        price: shipping.cost,
                        subtotal: shipping.cost
                    };
                    // check shipping already in the cart
                    var idx;
                    var len = cart.items.length;
                    for(idx = 0; idx < len; idx++) {
                        if(cart.items[idx].sku == item.sku) {
                            break;
                        }
                    }
                    if(idx == len) {
                        // not already in cart
                        cart.items.push(item);
                    } else {
                        cart.items[idx] = item;
                    }
                    cart.total = calcTotal(cart.items);
                    // work out tax
                    cart.tax = calcTax(cart.total);

                    // save the updated cart
                    saveCart(req.params.id, cart);
                    res.json(cart);
                }
            }
        });
    }
});

function mergeList(list, product, qty) {
    var inlist = false;
    // loop through looking for sku
    var idx;
    var len = list.length;
    for(idx = 0; idx < len; idx++) {
        if(list[idx].sku == product.sku) {
            inlist = true;
            break;
        }
    }

    if(inlist) {
        list[idx].qty += qty;
        list[idx].subtotal = list[idx].price * list[idx].qty;
    } else {
        list.push(product);
    }

    return list;
}

function calcTotal(list) {
    var total = 0;
    for(var idx = 0, len = list.length; idx < len; idx++) {
        total += list[idx].subtotal;
    }

    return total;
}

function calcTax(total) {
    // tax @ 20%
    return (total - (total / 1.2));
}

function getProduct(sku) {
    return new Promise((resolve, reject) => {
        request('http://' + catalogueHost + ':8080/product/' + sku, (err, res, body) => {
            if(err) {
                reject(err);
            } else if(res.statusCode != 200) {
                reject(res.statusCode);
            } else {
                // return object - body is a string
                resolve(JSON.parse(body));
            }
        });
    });
}

function saveCart(id, cart) {
    console.log('saving cart', cart);
    redisClient.setex(id, 3600, JSON.stringify(cart), (err, data) => {
        if(err) {
            console.log('saveCart ERROR', err);
        }
    });
}

// connect to Redis
var redisClient = redis.createClient({
    host: redisHost
});

redisClient.on('error', (e) => {
    console.log('Redis ERROR', e);
});
redisClient.on('ready', (r) => {
    console.log('Redis READY', r);
    redisConnected = true;
});

// fire it up!
const port = process.env.CART_SERVER_PORT || '8080';
app.listen(port, () => {
    console.log('Started on port', port);
});
