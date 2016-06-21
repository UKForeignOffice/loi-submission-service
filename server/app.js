// Get the packages we need
var express = require('express');
var bodyParser = require('body-parser');
var config = require('./config/config');
var submissionController = require('./controllers/submission');
require('./config/logs');
// Create our Express application
var app = express();

app.set('showStackError', true);

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({
    extended: true
}));


//start listening on the rabbitMQ
submissionController.initQueue();

module.exports = app;