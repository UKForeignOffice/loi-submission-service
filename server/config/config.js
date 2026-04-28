var Sequelize = require('sequelize')
require('dotenv').config()

var additionalPaymentApiUrl = process.env.ADDITIONALPAYMENTAPIURL
var dbConn = process.env.DBCONN
var edmsAuthHost = process.env.EDMS_AUTH_HOST
var edmsAuthScope = process.env.EDMS_AUTH_SCOPE
var edmsBearerToken = JSON.parse(process.env.EDMS_BEARER_TOKEN)
var edmsHost = process.env.EDMS_HOST
var maxRetryAttempts = process.env.MAXRETRYATTEMPTS
var pollInterval = process.env.POLLINTERVAL
var submissionApiUrl = process.env.SUBMISSIONAPIURL
var nodeEnv = process.env.NODE_ENV || 'production'
var s3Bucket = process.env.S3_BUCKET

var config = {
  additionalPaymentApiUrl,
  db: dbConn,
  edmsBearerToken,
  edmsHost,
  edmsAuthHost,
  edmsAuthScope,
  maxRetryAttempts,
  pollInterval,
  submissionApiUrl,
  nodeEnv,
  s3Bucket,
}

module.exports = config
