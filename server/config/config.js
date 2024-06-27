var Sequelize = require('sequelize');
require('dotenv').config();

var additionalPaymentApiUrl = process.env.ADDITIONALPAYMENTAPIURL;
var dbConn = process.env.DBCONN;
var edmsAuthHost = process.env.EDMS_AUTH_HOST;
var edmsAuthScope = process.env.EDMS_AUTH_SCOPE;
var edmsBearerToken = JSON.parse(process.env.EDMS_BEARER_TOKEN);
var edmsHost = process.env.EDMS_HOST;
var maxRetryAttempts = process.env.MAXRETRYATTEMPTS
var pollInterval = process.env.POLLINTERVAL
var submissionApiUrl = process.env.SUBMISSIONAPIURL;

var config = {
    "additionalPaymentApiUrl": additionalPaymentApiUrl,
    "db": dbConn,
    "edmsBearerToken": edmsBearerToken,
    "edmsHost": edmsHost,
    edmsAuthHost,
    edmsAuthScope,
    "maxRetryAttempts": maxRetryAttempts,
    "pollInterval": pollInterval,
    "submissionApiUrl": submissionApiUrl,
};

module.exports = config;
