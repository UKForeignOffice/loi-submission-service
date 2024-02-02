// Get the packages we need
var express = require('express');
var bodyParser = require('body-parser');
var config = require('./config/config');
var pollForApplicationsController = require('./controllers/pollForApplications');
var pollForAdditionalPaymentsController = require('./controllers/pollForAdditionalPayments');
require('./config/logs');
// Create our Express application
var app = express();

app.set('showStackError', true);

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({
    extended: true
}));


setInterval(() => pollForApplicationsController.checkForApplications(), config.pollInterval);
setInterval(() => pollForAdditionalPaymentsController.checkForAdditionalPayments(), config.pollInterval);

module.exports = app;
