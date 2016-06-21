var rabbit = require('amqplib/callback_api');
var Sequelize = require('sequelize');
var request = require('request');
var crypto = require('crypto');
var fs = require('fs');
var config = require('../config/config');
var amqpConn = null;
var sequelize = new Sequelize(config.db);
var ExportedApplicationData = sequelize.import("../models/exportedApplicationData");
var Application = sequelize.import("../models/application");
var SubmissionAttempts = sequelize.import("../models/submissionAttempts");

function startQueue() {
    rabbit.connect(config.rabbitMQ.url + "?heartbeat=60", function (err, conn) {
        if (err) {
            console.error("[AMQP]", err.message);
            return setTimeout(startQueue, 1000);
        }
        conn.on("error", function (err) {
            if (err.message !== "Connection closing") {
                console.error("[AMQP] conn error", err.message);
            }
        });
        conn.on("close", function () {
            console.error("[AMQP] reconnecting");
            return setTimeout(startQueue, 1000);
        });
        console.log("[AMQP] connected");
        amqpConn = conn;
        whenConnected();
    });
}

function whenConnected() {
    startWorker();
}


// A worker that acks messages only if processed succesfully
function startWorker() {
    amqpConn.createChannel(function (err, ch) {
        if (closeOnErr(err)) return;
        ch.on("error", function (err) {
            console.error("[AMQP] channel error", err.message);
        });

        ch.on("close", function () {
            console.log("[AMQP] channel closed");
        });

        //ch.prefetch(10);
        var queueName = config.rabbitMQ.queueName;
        var exchangeName = config.rabbitMQ.exchangeName;
        var retryQueue = config.rabbitMQ.retryQueue;
        var retryExchange = config.rabbitMQ.retryExchange;

        ch.assertExchange(retryExchange, 'fanout', {durable: true}, function (err, ok) {
            ch.assertQueue(retryQueue, {
                durable: true,
                deadLetterExchange: exchangeName,
                messageTtl: config.rabbitMQ.retryDelay,
                deadLetterRoutingKey: queueName
            }, function (err, ok) {
                ch.bindQueue(retryQueue, retryExchange, '', null, function (err, ok) {
                    ch.assertExchange(exchangeName, 'fanout', {durable: true}, function (err, ok) {
                        ch.assertQueue(queueName, {
                            durable: true
                        }, function (err, ok) {
                            ch.bindQueue(queueName, exchangeName, '', null, function (err, ok) {
                                if (closeOnErr(err)) return;
                                ch.consume(queueName, processMsg, {noAck: false});
                                console.log(" [*] Waiting for messages in %s queue", queueName);
                            });
                        });
                    });
                });
            });
        });


        function processMsg(msg) {
            processSubmissionQueue(msg, function (ok, applicationJsonObject, responseStatusCode, responseBody) {
                var headers = msg.properties.headers;
                var appId = msg.content.toString();
                try {
                    if (ok) {
                        ch.ack(msg);
                        logSubmissionAttempt(appId, headers.retryAttempts, applicationJsonObject,'submitted', responseStatusCode, responseBody);
                    }
                    else {
                        // If the API request fails
                        //second argument is requeue - false will move the message to the submission queue
                        //where it will be dead-lettered back to the main queue
                        //after the retry interval set in the config

                        var retryAttempts = 1;
                        if (headers.retryAttempts) {
                            retryAttempts = headers.retryAttempts + 1;
                        }
                        var maxRetryAttempts = config.rabbitMQ.maxRetryAttempts;

                        if (retryAttempts > maxRetryAttempts) {
                            //if we have reached maxRetryAttempts, update the database to indicate failure
                            logSubmissionAttempt(appId, retryAttempts, applicationJsonObject,'failed', responseStatusCode, responseBody)
                                .then(function (results) {
                                //and acknowledge the message to remove it from the queue
                                ch.ack(msg);
                            }).catch(function (error) {
                                console.log(JSON.stringify(error));
                            });

                        }
                        else {
                            //reject the message to remove it from the main queue
                            ch.reject(msg, false);
                            //increment the retry attempts in the header
                            var messageOptions = {headers: {retryAttempts: retryAttempts}};
                            //and publish it to the retryQueue where it will be dead-lettered after the configured retryDelay
                            //and thus moved back to the main queue which must be configured as the dead-letter queue for the retryQueue
                            ch.publish(retryExchange, retryQueue, new Buffer(msg.content.toString()), messageOptions);
                            logSubmissionAttempt(appId, retryAttempts, applicationJsonObject,'failed', responseStatusCode, responseBody);
                        }
                    }
                } catch (e) {
                    closeOnErr(e);
                }
            });
        }
    });
}

function processSubmissionQueue(msg, callback) {
    var appId = msg.content.toString();
    console.log("Got msg ", appId);
    var submissionApiUrl = config.submissionApiUrl;
    var applicationJsonObject = {};


    ExportedApplicationData.findOne({
        attributes: ["application_id", "applicationType", "first_name", "last_name", "telephone", "email", "doc_count", "special_instructions", "user_ref", "payment_reference", "payment_amount", "postage_return_title", "postage_return_price", "postage_send_title", "postage_send_price", "main_house_name", "main_street", "main_town", "main_county", "main_country", "main_full_name", "main_postcode", "alt_house_name", "alt_street", "alt_town", "alt_county", "alt_country",
            "alt_full_name", "alt_postcode", "feedback_consent", "total_docs_count_price", "unique_app_id", "user_id", "company_name"],
        where: {
            application_id: appId
        }
    }).then(function (results) {
        if (!(results && results.dataValues)) {
            console.log('Cannot find ExportedApplicationData record for application_id ' + appId + '.  Removing from queue.');
            callback(true);
            return null;
        }

        applicationJsonObject = getApplicationObject(results.dataValues);

        console.log(JSON.stringify(applicationJsonObject));

        // calculate HMAC string and encode in base64
        var objectString = JSON.stringify(applicationJsonObject, null, 0);

        var hash = crypto.createHmac('sha512', config.hmacKey).update(new Buffer(objectString, 'utf-8')).digest('hex').toUpperCase();

        request.post({
                headers: {
                    "accept": "application/json",
                    "hash": hash,
                    "content-type": "application/json; charset=utf-8"
                },
                url: submissionApiUrl,
                //proxy: 'http://ldnisprx01:8080', //uncomment this line if running in your own debug environment
                agentOptions: config.certificatePath ? {
                    cert: fs.readFileSync(config.certificatePath),
                    key: fs.readFileSync(config.keyPath)
                } : null,
                json: true,
                body: applicationJsonObject
            }, function (error, response, body) {
                if (error) {
                    console.log(JSON.stringify(error));
                    callback(false, applicationJsonObject, (response.statusCode || ''), (body || ''));
                }
                else if (response.statusCode === 200) { // Successful submit response code
                    console.log('Application '+appId+' has been submitted successfully');

                    /*
                     * Update the application table for submit status, case reference and app reference
                     * (both received as a response from submission api)
                     */
                    Application.update(
                        {
                            submitted: 'submitted',
                            application_reference: body.applicationReference,
                            case_reference: body.caseReference
                        }, {
                            where: {
                                application_id: appId
                            }
                        }
                    ).then(function (results) {
                        if (results && results[0] === 1) {
                            //all finished processing - acknowledge the message from the queue so it can be removed
                            callback(true, applicationJsonObject, response.statusCode, body);
                        }
                        else {
                            console.log('Application ID ' + appId + ' not found in the database');
                            callback(false, applicationJsonObject, response.statusCode, body);
                        }
                    }).catch(function (error) {
                        console.log(JSON.stringify(error));
                        callback(false, applicationJsonObject, response.statusCode, body);
                    });
                } else {
                    console.log('error: ' + response.statusCode);
                    console.log(body);
                    callback(false, applicationJsonObject, response.statusCode, body);
                }
            }
        );
    });
}

function closeOnErr(err) {
    if (!err) return false;
    console.error("[AMQP] error", err);
    amqpConn.close();
    return true;
}

function getApplicationObject(results) {
    var altFullName;
    var altHouseName;
    var altStreet;
    var altTown;
    var altCounty;
    var altCountry;
    var altPostcode;


    //if there is no altername address, copy the details from the main address
    if (results.alt_full_name){
        altFullName = results.alt_full_name;
        altHouseName = results.alt_house_name;
        altStreet =  results.alt_street;
        altTown = results.alt_town;
        altCounty =  results.alt_county;
        altCountry =  results.alt_country;
        altPostcode =  results.alt_postcode;
    }
    else{
        altFullName = results.main_full_name;
        altHouseName = results.main_house_name;
        altStreet =  results.main_street;
        altTown = results.main_town;
        altCounty =  results.main_county;
        altCountry =  results.main_country;
        altPostcode =  results.main_postcode;
    }

    var obj;

    if(results.applicationType == "Postal Service") {

        obj = {
            "legalisationApplication": {
                "userId": "legalisation",
                "caseType": results.applicationType,
                "timestamp": (new Date()).getTime().toString(),
                "applicant": {
                    "forenames": trimWhitespace(results.first_name),
                    "surname": trimWhitespace(results.last_name),
                    "primaryTelephone": trimWhitespace(results.telephone),
                    "mobileTelephone": "",
                    "eveningTelephone": "",
                    "email": trimWhitespace(results.email)
                },
                "fields": {
                    "applicationReference": results.unique_app_id,
                    "postalType": results.postage_return_title,
                    "documentCount": results.doc_count,
                    "paymentReference": results.payment_reference,
                    "paymentAmount": results.payment_amount,
                    "customerInternalReference": trimWhitespace(results.user_ref),
                    "feedbackConsent": trimWhitespace(results.feedback_consent),
                    "companyName": results.company_name != 'N/A' ? results.company_name : "",
                    "companyRegistrationNumber": "",
                    "portalCustomerId": results.user_id == 0 ? "" : results.user_id,
                    "successfulReturnDetails": {
                        "fullName": trimWhitespace(results.main_full_name),
                        "address": {
                            "companyName": "",
                            "flatNumber": "",
                            "premises": "",
                            "houseNumber": trimWhitespace(results.main_house_name),
                            "street": trimWhitespace(results.main_street),
                            "district": "",
                            "town": trimWhitespace(results.main_town) || ' ',
                            "region": trimWhitespace(results.main_county) || ' ',
                            "postcode": trimWhitespace(results.main_postcode),
                            "country": trimWhitespace(results.main_country || 'United Kingdom')
                        }
                    },
                    "unsuccessfulReturnDetails": {
                        "fullName": altFullName,
                        "address": {
                            "companyName": "",
                            "flatNumber": "",
                            "premises": "",
                            "houseNumber": trimWhitespace(altHouseName),
                            "street": trimWhitespace(altStreet) || ' ',
                            "district": "",
                            "town": trimWhitespace(altTown) || ' ',
                            "region": trimWhitespace(altCounty),
                            "postcode": trimWhitespace(altPostcode),
                            "country": trimWhitespace(altCountry || 'United Kingdom')
                        }
                    },
                    "additionalInformation": ""
                }
            }
        };
    }

    else {
        obj = {
            "legalisationApplication": {
                "userId": "legalisation",
                "caseType": results.applicationType,
                "timestamp": (new Date()).getTime().toString(),
                "applicant": {
                    "forenames": trimWhitespace(results.first_name),
                    "surname": trimWhitespace(results.last_name),
                    "primaryTelephone": trimWhitespace(results.telephone),
                    "mobileTelephone": "",
                    "eveningTelephone": "",
                    "email": trimWhitespace(results.email)
                },
                "fields": {
                    "applicationReference": results.unique_app_id,
                    "postalType": results.postage_return_title,
                    "documentCount": results.doc_count,
                    "paymentReference": results.payment_reference,
                    "paymentAmount": results.payment_amount,
                    "customerInternalReference": trimWhitespace(results.user_ref),
                    "feedbackConsent": trimWhitespace(results.feedback_consent),
                    "companyName":  results.company_name != 'N/A' ? results.company_name : "",
                    "companyRegistrationNumber": "",
                    "portalCustomerId":  results.user_id == 0 ? "" : results.user_id,
                    "additionalInformation": ""
                }
            }
        };
    }

    return obj;
}

//exposed methods
exports.initQueue = function () {
    startQueue();
};

function trimWhitespace(input) {
    if ((typeof input) === "string") {
        return input.replace(/^\s+|\s+$/gm, '');
    }
    if (input === null || input === undefined) {
        return " ";
    }
    else {
        return input;
    }
}


function logSubmissionAttempt(application_id, retry_number, submitted_json, status, response_status_code, response_body){
    //return promise
    return SubmissionAttempts.create({
            application_id: application_id,
            retry_number: retry_number || 0,
            submitted_json: submitted_json,
            status:  status,
            response_status_code: response_status_code,
            response_body: JSON.stringify(response_body)
        });
}

