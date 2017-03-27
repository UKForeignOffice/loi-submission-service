var dotenv = require('dotenv');
var env = dotenv.config({path: process.env.DOTENV || '.env'});

var rabbitMq = JSON.parse(env.RABBITMQ);
var serverUrl = env.SERVERURL;
var dbConn = env.DBCONN;
var submissionApiUrl = env.SUBMISSIONAPIURL;
var certificatePath = env.CERTPATH;
var keyPath = env.KEYPATH;
var pgpassword = env.PGPASSWORD;
var baseRoute = env.BASEROUTE;
var hmacKey = env.HMACKEY;

var Sequelize = require('sequelize');

var config = {
    "rabbitMQ": {url: rabbitMq.url, queueName: rabbitMq.queueName, exchangeName: rabbitMq.exchangeName, retryQueue: rabbitMq.retryQueue, retryExchange: rabbitMq.retryExchange, retryDelay: rabbitMq.retryDelay, maxRetryAttempts: rabbitMq.maxRetryAttempts },
    "serverUrl":serverUrl,
    'db': dbConn,
    'submissionApiUrl': submissionApiUrl,
    'certificatePath': certificatePath,
    'keyPath': keyPath,
    'pgpassword': pgpassword,
    'baseRoute': baseRoute,
    'hmacKey': hmacKey
};

module.exports = config;