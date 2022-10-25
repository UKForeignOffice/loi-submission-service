require('dotenv').config();

// var rabbitMq = JSON.parse(env.RABBITMQ);
var dbConn = process.env.DBCONN;
var submissionApiUrl = process.env.SUBMISSIONAPIURL;
var certificatePath = process.env.CASEBOOKCERTIFICATE;
var keyPath = process.env.CASEBOOKKEY;
var edmsHost = process.env.EDMS_HOST;
var edmsBearerToken = process.env.EDMS_BEARER_TOKEN;
var additionalPaymentApiUrl = process.env.ADDITIONALPAYMENTAPIURL;
var hmacKey = process.env.HMACKEY;
var maxRetryAttempts = process.env.MAXRETRYATTEMPTS
var pollInterval = process.env.POLLINTERVAL

var Sequelize = require('sequelize');

var config = {
    "maxRetryAttempts": maxRetryAttempts,
    "pollInterval": pollInterval,
    'db': dbConn,
    'submissionApiUrl': submissionApiUrl,
    'edmsHost': edmsHost,
    'edmsBearerToken': edmsBearerToken,
    'additionalPaymentApiUrl': additionalPaymentApiUrl,
    'certificatePath': certificatePath,
    'keyPath': keyPath,
    'hmacKey': hmacKey
};

module.exports = config;
