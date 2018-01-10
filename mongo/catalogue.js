//
// Products
//
db = db.getSiblingDB('catalogue');
db.products.insertMany([
    {sku: 'PB-1', name: 'Positronic Brain', description: 'Highly advanced sentient processing unit', price: 42000, instock: 0, categories: ['components']},
    {sku: 'SVO-980', name: 'Servo 980Nm', description: 'Servo actuator with 980Nm of torque. Needs 24V 10A supply', price: 50, instock: 32, categories: ['components']},
    {sku: 'ROB-1', name: 'Robbie', description: 'Large mechanical workhorse, crude but effective', price: 1200, instock: 12, categories: ['complete']},
    {sku: 'EVE-1', name: 'Eve', description: 'Extraterrestrial Vegetation Evaluator', price: 5000, instock: 10, categories: ['complete']}
]);

// full text index for searching
db.products.createIndex({
    name: "text",
    description: "text"
});

// unique index for product sku
db.products.createIndex(
    { sku: 1 },
    { unique: true }
);

