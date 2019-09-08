/*jshint esversion: 8 */

const mongoClient = require('mongodb').MongoClient;
const bindingName = 'catalogue_database';

var mongoURL = 'mongodb://mongodb:27017/catalogue';

if (process.env.VCAP_SERVICES) {
    connectionDetails = null;

    for (let [key, value] of Object.entries(JSON.parse(process.env.VCAP_SERVICES))) {
        connectionDetails = value.find(function(binding) {
            return bindingName == binding.binding_name && binding.credentials;
        }).credentials;

        if (connectionDetails) {
            mongoURL = connectionDetails.uri;
            break;
        }
    }
} else if (process.env.MONGO_URL) {
    mongoURL = process.env.MONGO_URL;
}

if (!mongoURL) {
    throw new Error('MongoDB connection data missing');
}

mongoClient.connect(mongoURL)
    .catch(function(err) {
        console.log(`Cannot connect to the MongoDB database: ${err}`);
        process.exit(4242);
    })
    .then(function(db) {
        console.log('Creating products collection');

        products = db.collection('products');

        // Delete all old product entries before adding new ones
        products.deleteMany({});
        products.insertMany([
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
        ]);

        //
        // Users
        //
        console.log('Creating users collection');

        const users = db.collection('users');

        console.log('Starting users import');

        // Delete all old user entries before adding new ones
        users.deleteMany({});
        users.insertMany([
            {name: 'user', password: 'password', email: 'user@me.com'},
            {name: 'stan', password: 'bigbrain', email: 'stan@instana.com'}
        ]);

        // unique index on the name
        users.createIndex(
            {name: 1},
            {unique: true}
        );

        console.log('Users imported');

        console.log('Creating catalogue collection');

        const catalogue = db.collection('catalogue');

        console.log('Starting catalogue import');

        // Delete all old catalogue entries before adding new ones
        catalogue.deleteMany({});
        catalogue.insertMany([
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
        ]);

        // full text index for searching
        catalogue.createIndex({
            name: "text",
            description: "text"
        });

        // unique index for product sku
        catalogue.createIndex(
            { sku: 1 },
            { unique: true }
        );

        console.log('Products imported');
    })
    .then(function() {
        console.log('All done');
        process.exit(0);
    })
    .catch(function(err) {
        console.log(`Error while importing data into the MongoDB '${bindingName}' database: ${err}`);
        process.exit(42);
    });