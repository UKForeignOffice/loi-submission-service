require('dotenv').config();

// var rabbitMq = JSON.parse(env.RABBITMQ);
var dbConn = process.env.DBCONN;
var submissionApiUrl = process.env.SUBMISSIONAPIURL;
var certificatePath = process.env.CASEBOOKCERTIFICATE;
var keyPath = process.env.CASEBOOKKEY;
var hmacKey = process.env.HMACKEY;
var maxRetryAttempts = process.env.MAXRETRYATTEMPTS
var pollInterval = process.env.POLLINTERVAL

var Sequelize = require('sequelize');
console.log("certificatePath", certificatePath)
var config = {
    // "rabbitMQ": {url: rabbitMq.url, queueName: rabbitMq.queueName, exchangeName: rabbitMq.exchangeName, retryQueue: rabbitMq.retryQueue, retryExchange: rabbitMq.retryExchange, retryDelay: rabbitMq.retryDelay, maxRetryAttempts: rabbitMq.maxRetryAttempts },
    "maxRetryAttempts": maxRetryAttempts,
    "pollInterval": pollInterval,
    'db': dbConn,
    'submissionApiUrl': submissionApiUrl,
    'certificatePath': certificatePath,
    'keyPath': keyPath,
    'hmacKey': hmacKey
};

module.exports = config;
