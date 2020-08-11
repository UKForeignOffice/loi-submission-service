var Sequelize = require('sequelize');
var request = require('request');
var crypto = require('crypto');
var fs = require('fs');
var config = require('../config/config');
var sequelize = new Sequelize(config.db);
var ExportedApplicationData = sequelize.import("../models/exportedApplicationData");
var Application = sequelize.import("../models/application");
var SubmissionAttempts = sequelize.import("../models/submissionAttempts");

function checkForApplications() {
    Application.findOne({
        where: {
            submitted: 'queued'
        }
    }).then(function (results) {

        // results.forEach(function(queuedApplication) {
        //     console.log(queuedApplication.application_id);
        // })
            // console.log('queued applications', results)

        processMsg(results.dataValues.application_id)

        })
}

function processMsg(msg) {
    processSubmissionQueue(msg, function (ok, applicationJsonObject, responseStatusCode, responseBody) {
        // var headers = msg.properties.headers;
        var headers = 1;
        var appId = msg;
        try {
            if (ok) {
                // ch.ack(msg);
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
                    // ch.reject(msg, false);
                    //increment the retry attempts in the header
                    var messageOptions = {headers: {retryAttempts: retryAttempts}};
                    //and publish it to the retryQueue where it will be dead-lettered after the configured retryDelay
                    //and thus moved back to the main queue which must be configured as the dead-letter queue for the retryQueue
                    // ch.publish(retryExchange, retryQueue, new Buffer(msg.content.toString()), messageOptions);
                    logSubmissionAttempt(appId, retryAttempts, applicationJsonObject,'failed', responseStatusCode, responseBody);
                }
            }
        } catch (e) {
            console.log(e);
        }
    });
}

function processSubmissionQueue(msg, callback) {
    var appId = msg;
    console.log("Got msg ", appId);
    var submissionApiUrl = config.submissionApiUrl;
    var applicationJsonObject = {};


    ExportedApplicationData.findOne({
        attributes: ["application_id", "applicationType", "first_name", "last_name", "telephone", "mobileNo", "email", "doc_count", "special_instructions", "user_ref", "payment_reference", "payment_amount", "postage_return_title", "postage_return_price", "postage_send_title", "postage_send_price", "main_house_name", "main_street", "main_town", "main_county", "main_country", "main_full_name", "main_postcode", "main_telephone", "main_mobileNo", "main_email", "alt_house_name", "alt_street", "alt_town", "alt_county", "alt_country",
            "alt_full_name", "alt_postcode", "alt_telephone","alt_mobileNo", "alt_email", "feedback_consent", "total_docs_count_price", "unique_app_id", "user_id", "company_name", "main_organisation", "alt_organisation"],
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


        // calculate HMAC string and encode in base64
        var objectString = JSON.stringify(applicationJsonObject, null, 0);

        var hash = crypto.createHmac('sha512', config.hmacKey).update(new Buffer(objectString, 'utf-8')).digest('hex').toUpperCase();

        request.post({
                headers: {
                    "accept": "application/json",
                    "hash": hash,
                    "content-type": "application/json; charset=utf-8",
                    "api-version": "3"
                },
                url: submissionApiUrl,
                //proxy: 'http://ldnisprx01:8080', //uncomment this line if running in your own debug environment
                agentOptions: config.certificatePath ? {
                    cert: config.certificatePath,
                    key: config.keyPath
                } : null,
                json: true,
                body: applicationJsonObject
            }, function (error, response, body) {
                if (error) {
                    // console.log(JSON.stringify(error));
                    console.log(error);
                    callback(false, applicationJsonObject, (response ? response.statusCode : ''), (body || ''));
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
                        console.error(JSON.stringify(error));
                        callback(false, applicationJsonObject, response.statusCode, body);
                    });
                } else {
                    console.error('error: ' + response.statusCode);
                    console.error(body);
                    callback(false, applicationJsonObject, response.statusCode, body);
                }
            }
        );
    });
}

function getApplicationObject(results) {
    var altFullName;
    var altStreet;
    var altTown;
    var altCounty;
    var altCountry;
    var altPostcode;
    var altTelephone;
    var altMobileNo;
    var altEmail;

    /**
     * Address Mapping
     */

    var casebookJSON =  {
        main: {
            "companyName": results.main_organisation != 'N/A' && results.main_organisation !== null && results.main_organisation != " " ? results.main_organisation : "",
            "flatNumber": "",
            "premises": "",
            "houseNumber": "",
            "postcode": results.postcode
        },
        alt: {
            "companyName": "",
            "flatNumber": "",
            "premises": "",
            "houseNumber": "",
            "postcode": ""
        }
    };

    updateCaseBookJSON('main',trimWhitespace(results.main_house_name));

//if there is no alternate address, copy the details from the main address
    if (results.alt_full_name){
        altFullName = results.alt_full_name;
        altStreet =  results.alt_street;
        altTown = results.alt_town;
        altCounty =  results.alt_county;
        altCountry =  results.alt_country;
        altPostcode =  results.alt_postcode;
        altTelephone = results.alt_telephone;
        altMobileNo = results.alt_mobileNo;
        altEmail = results.alt_email;
        casebookJSON.postcode =  results.alt_postcode;
        casebookJSON.alt.companyName = results.alt_organisation && results.alt_organisation != 'N/A' && results.alt_organisation.length !== 0 && results.alt_organisation != " " ? results.alt_organisation : "";
        updateCaseBookJSON('alt',trimWhitespace(results.alt_house_name));
    }
    else{
        altFullName = results.main_full_name;
        casebookJSON.alt.companyName = casebookJSON.main.companyName;
        updateCaseBookJSON('alt',trimWhitespace(results.main_house_name));
        altStreet =  results.main_street;
        altTown = results.main_town;
        altCounty =  results.main_county;
        altCountry =  results.main_country;
        altPostcode =  results.main_postcode;
        altTelephone = results.main_telephone;
        altMobileNo = results.main_mobileNo;
        altEmail = results.main_email;
    }


    function updateCaseBookJSON(type,house) {
        var isNumeric = require("isnumeric");
        var house_name = house.toString().split(" ");
        var apartments = house.indexOf('Apartments');
        var flats = house.indexOf('Flat');



        if(house_name[0].toLowerCase()=="flat"  &&  isNumeric(house_name[1].replace(',','').substr(1,isNumeric(house_name[1].replace(',','').length)))){
            casebookJSON[type].flatNumber = house_name[1].replace(',','');
            if(isNumeric(house_name[house_name.length-1].replace("-","").replace(',',''))){
                casebookJSON[type].houseNumber = house_name[house_name.length-1].replace(',','');
                casebookJSON[type].premises  = house.substr(casebookJSON[type].flatNumber.length+7,house.toString().length-(casebookJSON[type].flatNumber.length+7)-(casebookJSON[type].houseNumber.length+1));
            }else {
                casebookJSON[type].premises = house.substr(house_name[0].length + house_name[1].length + 1, house.length).replace(',', '');
            }
        }
        else if(isNumeric(house_name[house_name.length-1].replace("-",""))){
            casebookJSON[type].houseNumber = house_name[house_name.length-1];
            if(apartments!=-1 || flats != -1){
                var subBuilding =  house.substr(0,house.length- house_name[house_name.length-1].length).replace(',','');
                if(subBuilding.split(" ")[0].toLowerCase()=="flat"){
                    casebookJSON[type].flatNumber = subBuilding.split(" ")[1];
                    casebookJSON[type].premises  = subBuilding.substr(subBuilding.split(" ")[0].length+subBuilding.split(" ")[1].length+2, subBuilding.length-1).replace(',','') ;
                }else {
                    casebookJSON[type].flatNumber = subBuilding.split(" ")[0];
                    casebookJSON[type].premises  = subBuilding.substr(subBuilding.split(" ")[0].length, subBuilding.length-1).replace(',','') ;
                }


            }else{
                casebookJSON[type].premises  =house.substr(0,house.length- house_name[house_name.length-1].length).replace(',','');

            }
        }
        else if(house_name[0].toLowerCase()=="flat"  && isNumeric(house_name[1].replace(',','') )){
            casebookJSON[type].flatNumber = house_name[1].replace(',','');
            casebookJSON[type].premises  =house.substr(house_name[0].length +house_name[1].length+1,house.length ).replace(',','');
        }
        else if(isNumeric(house_name[0].split(/[A-Za-z]/)[0])){
            casebookJSON[type].houseNumber = house_name[0];
            casebookJSON[type].premises  =house.substr(house_name[0].length+1,house.length ).replace(',','');
        }else if(isNumeric(house_name[0].replace("-",""))){
            casebookJSON[type].houseNumber = house_name[0].replace(',','');
            casebookJSON[type].premises  =house.substr(house_name[0].length+1,house.length ).replace(',','');
        }
        else if(isNumeric(house_name[0].replace(",",""))){
            casebookJSON[type].houseNumber = house_name[0].replace(',','');
            casebookJSON[type].premises  =house.substr(house_name[0].length+1,house.length-house_name[0].length+1 ).replace(',','');
        }
        else if(house.length>10 ){
            casebookJSON[type].premises =house.replace(',','');
        }
        else {
            casebookJSON[type].premises = house;
        }

        //Catch all fixes
        if(casebookJSON[type].houseNumber.length>10){
            casebookJSON[type].premises = casebookJSON[type].houseNumber + casebookJSON[type].premises;
            casebookJSON[type].houseNumber="";
        }
        if(casebookJSON[type].flatNumber.length>10){
            casebookJSON[type].premises = 'Flat '+casebookJSON[type].flatNumber + casebookJSON[type].premises;
            casebookJSON[type].flatNumber="";
        }
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
                    "mobileTelephone": trimWhitespace(results.mobileNo),
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
                    "portalCustomerId": results.user_id === 0 ? "" : results.user_id,
                    "successfulReturnDetails": {
                        "fullName": trimWhitespace(results.main_full_name),
                        "address": {
                            "companyName": casebookJSON.main.companyName,
                            "flatNumber": casebookJSON.main.flatNumber || "",
                            "premises": casebookJSON.main.premises ||"",
                            "houseNumber": casebookJSON.main.houseNumber || "",
                            "street": trimWhitespace(results.main_street),
                            "district": "",
                            "town": trimWhitespace(results.main_town) || ' ',
                            "region": trimWhitespace(results.main_county) || ' ',
                            "postcode": trimWhitespace(results.main_postcode),
                            "country": trimWhitespace(results.main_country || 'United Kingdom')
                        },
                        "telephone": trimWhitespace(results.main_telephone || ""),
                        "mobileNo": trimWhitespace(results.main_mobileNo || ""),
                        "email": trimWhitespace(results.main_email || "")
                    },
                    "unsuccessfulReturnDetails": {
                        "fullName": altFullName,
                        "address": {
                            "companyName": casebookJSON.alt.companyName,
                            "flatNumber": casebookJSON.alt.flatNumber || "",
                            "premises": casebookJSON.alt.premises || "",
                            "houseNumber": casebookJSON.alt.houseNumber || "",
                            "street": trimWhitespace(altStreet) || ' ',
                            "district": "",
                            "town": trimWhitespace(altTown) || ' ',
                            "region": trimWhitespace(altCounty),
                            "postcode": trimWhitespace(altPostcode),
                            "country": trimWhitespace(altCountry || 'United Kingdom')
                        },
                        "telephone": trimWhitespace(altTelephone || ""),
                        "mobileNo": trimWhitespace(altMobileNo || ""),
                        "email": trimWhitespace(altEmail || "")
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
                    "mobileTelephone": trimWhitespace(results.mobileNo),
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
                    "portalCustomerId":  results.user_id === 0 ? "" : results.user_id,
                    "additionalInformation": ""
                }
            }
        };
    }

    return obj;
}

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

//exposed methods
exports.checkForApplications = function () {
    checkForApplications();
};
