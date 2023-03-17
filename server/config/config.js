var Sequelize = require('sequelize');
require('dotenv').config();

var additionalPaymentApiUrl = process.env.ADDITIONALPAYMENTAPIURL;
var certificatePath = process.env.NODE_ENV !== 'development' ? process.env.CASEBOOKCERTIFICATE : process.env.CASEBOOKCERTIFICATE.replace(/\\n/gm, '\n');
var dbConn = process.env.DBCONN;
var edmsAuthHost = process.env.EDMS_AUTH_HOST;
var edmsAuthScope = process.env.EDMS_AUTH_SCOPE;
var edmsBearerToken = JSON.parse(process.env.EDMS_BEARER_TOKEN);
var edmsHost = process.env.EDMS_HOST;
var hmacKey = process.env.HMACKEY;
var keyPath = process.env.NODE_ENV !== 'development' ? process.env.CASEBOOKKEY : process.env.CASEBOOKKEY.replace(/\\n/gm, '\n');
var maxRetryAttempts = process.env.MAXRETRYATTEMPTS
var pollInterval = process.env.POLLINTERVAL
var submissionApiUrl = process.env.SUBMISSIONAPIURL;

var config = {
    "additionalPaymentApiUrl": additionalPaymentApiUrl,
    "certificatePath": certificatePath,
    "db": dbConn,
    "edmsBearerToken": edmsBearerToken,
    "edmsHost": edmsHost,
    edmsAuthHost,
    edmsAuthScope,
    "hmacKey": hmacKey,
    "keyPath": keyPath,
    "maxRetryAttempts": maxRetryAttempts,
    "pollInterval": pollInterval,
    "submissionApiUrl": submissionApiUrl,
};

module.exports = config;
