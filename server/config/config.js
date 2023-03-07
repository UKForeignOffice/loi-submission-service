require('dotenv').config();

// var rabbitMq = JSON.parse(env.RABBITMQ);
var dbConn = process.env.DBCONN;
var submissionApiUrl = process.env.SUBMISSIONAPIURL;
var additionalPaymentApiUrl = process.env.ADDITIONALPAYMENTAPIURL;
var certificatePath = process.env.NODE_ENV !== 'development' ? process.env.CASEBOOKCERTIFICATE : process.env.CASEBOOKCERTIFICATE.replace(/\\n/gm, '\n');
var keyPath = process.env.NODE_ENV !== 'development' ? process.env.CASEBOOKKEY : process.env.CASEBOOKKEY.replace(/\\n/gm, '\n');
var hmacKey = process.env.HMACKEY;
var maxRetryAttempts = process.env.MAXRETRYATTEMPTS
var pollInterval = process.env.POLLINTERVAL

var Sequelize = require('sequelize');

var config = {
    // "rabbitMQ": {url: rabbitMq.url, queueName: rabbitMq.queueName, exchangeName: rabbitMq.exchangeName, retryQueue: rabbitMq.retryQueue, retryExchange: rabbitMq.retryExchange, retryDelay: rabbitMq.retryDelay, maxRetryAttempts: rabbitMq.maxRetryAttempts },
    "maxRetryAttempts": maxRetryAttempts,
    "pollInterval": pollInterval,
    'db': dbConn,
    'submissionApiUrl': submissionApiUrl,
    'additionalPaymentApiUrl': additionalPaymentApiUrl,
    'certificatePath': certificatePath,
    'keyPath': keyPath,
    'hmacKey': hmacKey
};

module.exports = config;
