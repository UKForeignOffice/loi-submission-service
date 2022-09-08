require('dotenv').config();

// var rabbitMq = JSON.parse(env.RABBITMQ);
var dbConn = process.env.DBCONN;
var submissionApiUrl = process.env.SUBMISSIONAPIURL;
var edmsHost = process.env.EDMS_HOST;
var edmsBearerToken = process.env.EDMS_BEARER_TOKEN;
var additionalPaymentApiUrl = process.env.ADDITIONALPAYMENTAPIURL;
var certificatePath = process.env.NODE_ENV !== 'development' ? process.env.CASEBOOKCERTIFICATE : process.env.CASEBOOKCERTIFICATE.replace(/\\n/gm, '\n');
var keyPath = process.env.NODE_ENV !== 'development' ? process.env.CASEBOOKKEY : process.env.CASEBOOKKEY.replace(/\\n/gm, '\n');
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
