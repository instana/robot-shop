/*jshint esversion: 8 */

const mongoClient = require('mongodb').MongoClient;

new Promise((resolve, reject) => {
    if (process.env.VCAP_SERVICES) {
        const bindingName = 'catalogue_database';

        connectionDetails = null;
    
        for (let [key, value] of Object.entries(JSON.parse(process.env.VCAP_SERVICES))) {
            connectionDetails = value.find(function(binding) {
                return bindingName == binding.binding_name && binding.credentials;
            }).credentials;
    
            if (!connectionDetails) {
                reject(`Cannot find a service binding with name '${bindingName}'`);
            }

            const username = connectionDetails.username;
            const password = connectionDetails.password;

            const normalizedAuthDetails = `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;

            const mongoUrl = connectionDetails.uri.replace(`${username}:${password}`, normalizedAuthDetails);

            resolve(mongoUrl);
        }
    } else if (process.env.MONGO_URL) {
        resolve(process.env.MONGO_URL);
    } else {
        reject('MongoDB connection data missing');
    }
}).then(function (mongoUrl) {
    console.log(`Connecting to ${mongoUrl}`);

    return mongoClient.connect(mongoUrl);
}).then(function(db) {
    const products = db.collection('products');
    const users = db.collection('users');

    return products
        .deleteMany({})
        .then(products.insertMany([
            {sku: 'HAL-1', name: 'HAL', description: 'Sorry Dave, I cant do that', price: 2001, instock: 2, categories: ['AI']},
            {sku: 'PB-1', name: 'Positronic Brain', description: 'Highly advanced sentient processing unit with the laws of robotics burned in', price: 200, instock: 0, categories: ['AI']},
            {sku: 'ROB-1', name: 'Robbie', description: 'Large mechanical workhorse, crude but effective. Comes in handy when you are lost in space', price: 1200, instock: 12, categories: ['Robot']},
            {sku: 'EVE-1', name: 'Eve', description: 'Extraterrestrial Vegetation Evaluator', price: 5000, instock: 10, categories: ['Robot']},
            {sku: 'C3P0', name: 'C3P0', description: 'Protocol android', price: 700, instock: 1, categories: ['Robot']},
            {sku: 'R2D2', name: 'R2D2', description: 'R2 maintenance robot and secret messenger. Help me Obi Wan', price: 1400, instock: 1, categories: ['Robot']},
            {sku: 'K9', name: 'K9', description: 'Time travelling companion at heel', price: 300, instock: 12, categories: ['Robot']},
            {sku: 'RD-10', name: 'Kryten', description: 'Red Drawf crew member', price: 700, instock: 5, categories: ['Robot']},
            {sku: 'HHGTTG', name: 'Marvin', description: 'Marvin, your paranoid android. Brain the size of a planet', price: 42, instock: 48, categories: ['Robot']},
            {sku: 'STAN-1', name: 'Stan', description: 'APM guru', price: 50, instock: 1000, categories: ['Robot', 'AI']},
            {sku: 'STNG', name: 'Mr Data', description: 'Could be R. Daneel Olivaw? Protype positronic brain android', price: 1000, instock: 0, categories: ['Robot']}
        ]))
        // full text index for searching
        .then(products.createIndex({
            name: 'text',
            description: 'text'
        }))
        // unique index for product sku
        .then(products.createIndex(
            { sku: 1 },
            { unique: true }
        ))
        .then(function() {
            console.log('Populated \'products\' collection');
        })
        .then(users.deleteMany({}))
        .then(users.insertMany([
            {name: 'user', password: 'password', email: 'user@me.com'},
            {name: 'stan', password: 'bigbrain', email: 'stan@instana.com'}
        ]))
        .then(users.createIndex(
            {name: 1},
            {unique: true}
        ))
        .then(function () {
            console.log('Populated \'users\' collection');
        })
})
.then(function() {
    console.log('All done');
    process.exit(0);
})
.catch(function(err) {
    console.log(`Error while importing data into the MongoDB database: ${err}`);
    process.exit(42);
});