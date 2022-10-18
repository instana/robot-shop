//
// Products
//
db = db.getSiblingDB('users');
db.users.insertMany([
    {name: 'user', password: 'password', email: 'user@me.com'},
    {name: 'asserts', password: 'bigbrain', email: 'info@asserts.ai'},
    {name: 'partner-57', password: 'worktogether', email: 'howdy@partner.com'}
]);

// unique index on the name
db.users.createIndex(
    {name: 1},
    {unique: true}
);

