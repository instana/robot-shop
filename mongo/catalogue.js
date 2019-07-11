//
// Products
//
db = db.getSiblingDB('catalogue');
db.products.insertMany([
    {sku: 'HAL-1', name: 'HAL', description: 'Sorry Dave, I cant do that', price: 2001, instock: 2, categories: ['Artificial Intelligence']},
    {sku: 'PB-1', name: 'Positronic Brain', description: 'Highly advanced sentient processing unit with the laws of robotics burned in', price: 200, instock: 0, categories: ['Artificial Intelligence']},
    {sku: 'ROB-1', name: 'Robbie', description: 'Large mechanical workhorse, crude but effective. Comes in handy when you are lost in space', price: 1200, instock: 12, categories: ['Robot']},
    {sku: 'EVE-1', name: 'Eve', description: 'Extraterrestrial Vegetation Evaluator', price: 5000, instock: 10, categories: ['Robot']},
    {sku: 'C3P0', name: 'C3P0', description: 'Protocol android', price: 953, instock: 1, categories: ['Robot']},
    {sku: 'R2D2', name: 'R2D2', description: 'R2 maintenance robot and secret messenger. Help me Obi Wan', price: 1024, instock: 1, categories: ['Robot']},
    {sku: 'K9', name: 'K9', description: 'Time travelling companion at heel', price: 300, instock: 12, categories: ['Robot']},
    {sku: 'RD-10', name: 'Kryten', description: 'Red Drawf crew member', price: 700, instock: 5, categories: ['Robot']},
    {sku: 'HHGTTG', name: 'Marvin', description: 'Marvin, your paranoid android. Brain the size of a planet', price: 42, instock: 48, categories: ['Robot']},
    {sku: 'STAN-1', name: 'Stan', description: 'APM guru', price: 67, instock: 1000, categories: ['Robot', 'Artificial Intelligence']},
    {sku: 'STNG', name: 'Mr Data', description: 'Could be R. Daneel Olivaw? Protype positronic brain android', price: 1000, instock: 0, categories: ['Robot']}
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

