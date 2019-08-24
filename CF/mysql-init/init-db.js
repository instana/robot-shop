/*jshint esversion: 6 */
(function () {
    'use strict';

    if (!process.env.VCAP_SERVICES) {
        throw new Error('No services bound (VCAP_SERVICES env var not found)');
    }

    var connectionDetails;

    for (let [key, value] of Object.entries(JSON.parse(process.env.VCAP_SERVICES))) {
        connectionDetails = value.find(function(binding) {
            return 'shipping_database' == binding.binding_name && binding.credentials;
        }).credentials;

        if (connectionDetails) {
            break;
        }
    }

    if (!connectionDetails) {
        throw new Error('Cannot extract MySQL connection details: ' + process.env.VCAP_SERVICES);
    }

    require('mysql-import').config({
        host: connectionDetails.hostname,
        user: connectionDetails.username,
        password: connectionDetails.password,
        database: connectionDetails.name,
        onerror: err=>console.log(err.message)
    }).import('init.sql')
        .then(() => console.log('Database imported'));

}());