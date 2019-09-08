/*jshint esversion: 6 */
(function () {
    'use strict';

    const fs = require('fs');

    const initArgv = process.argv.slice(2);

    if (initArgv.length != 2) {
        console.error(`Usage: ${process.argv[0]} ${process.argv[1]} <sql-file> <mysql-service-binding-name>\n\nProgram arguments: ${process.argv.join(' ')}`);
        process.exit(1);
    }

    const sqlFile = initArgv[0];
    const bindingName = initArgv[1];

    const appEnv = require('cfenv').getAppEnv();

    if (appEnv.isLocal) {
        throw new Error('Not running in Cloud Foundry (\'VCAP_SERVICES\' env var not found)');
    }

    var connectionDetails = appEnv.getServiceCreds(bindingName);

    if (!connectionDetails) {
        throw new Error(`No service binding with name '${bindingName}' found`);
    }

    if (fs.existsSync(sqlFile)) {
        console.log('Starting database import');

        require('mysql-import').config({
            host: connectionDetails.hostname,
            user: connectionDetails.username,
            password: connectionDetails.password,
            database: connectionDetails.name,
            onerror: err=>console.log(err.message)
        }).import(sqlFile)
            .then(() => console.log('Database imported'));
    } else {
        throw new Error(`File '${sqlFile}' not found!`);
    }

}());