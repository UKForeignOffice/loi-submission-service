var request = require('request');
var crypto = require('crypto');
var config = require('../config/config');
var AdditionalPaymentDetails = require('../models/index').AdditionalPaymentDetails
var Application = require('../models/index').Application
var moment = require('moment');
var maxRetryAttempts = config.maxRetryAttempts;
const { Op } = require("sequelize");
const {getEdmsAccessToken} = require("../services/HelperService");

var checkForAdditionalPayments = {
    checkForAdditionalPayments: async function() {
        try {

            let results = await checkForEligibleAdditionalPayments()

            if (results){
                let submissionDestination = await getSubmissionDestination(results.dataValues.application_id)
                await processMessage(results.dataValues, submissionDestination.dataValues.submission_destination)
            }
        } catch (error) {
            console.log(error)
        }

        async function checkForEligibleAdditionalPayments() {
            try {
                return await AdditionalPaymentDetails.findOne({
                    where: {
                        submitted: 'queued',
                        submission_attempts: {
                            [Op.lte]: maxRetryAttempts
                        }
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }

        async function getSubmissionDestination(application_id) {
            try {
                return await Application.findOne({
                    attributes: ['submission_destination'],
                    where: {
                        unique_app_id: application_id
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }

        async function processMessage(additionalPayment, submissionDestination) {
            try {
                console.log(`Processing ${additionalPayment.application_id}`);

                const isOrbit = submissionDestination === 'ORBIT'
                let payload = await generatePayload(additionalPayment)

                let response

                if (isOrbit) {
                    response = await submitToOrbit(additionalPayment, payload)
                } else {
                    response = await submitToCasebook(additionalPayment, payload)
                }

                if (response === 200) {
                    await markPaymentAsSubmitted(additionalPayment, response)
                } else {
                    let currentSubmissionAttempts = await getSubmissionAttempts(additionalPayment)
                    let retryAttempts = currentSubmissionAttempts.submission_attempts + 1

                    console.log(`maxRetryAttempts: ${maxRetryAttempts}`);
                    console.log(`retryAttempts: ${retryAttempts}`);

                    if (retryAttempts >= maxRetryAttempts) {
                        console.log(`Retry Attempt limit reached`)
                        await markPaymentAsFailed(additionalPayment, retryAttempts, response)
                    } else {
                        await updateSubmissionAttempts(additionalPayment, retryAttempts, response)
                    }
                }
            } catch (error) {
                console.log(error)
            }
        }

        async function generatePayload(additionalPayment) {
            try {
                return {
                    "payment": {
                        "timestamp": (new Date()).getTime().toString(),
                        "userId": 'legalisation',
                        "applicationReference": additionalPayment.application_id,
                        "reference": additionalPayment.payment_reference,
                        "amount": additionalPayment.payment_amount,
                        "gateway": 'GOV_PAY'
                    }
                }
            } catch (error) {
                console.log(error)
            }
        }

        async function submitToCasebook(additionalPayment, payload) {
            try {
                let additionalPaymentApiUrl = config.additionalPaymentApiUrl;
                let objectString = JSON.stringify(payload, null, 0);
                let hash = crypto.createHmac('sha512', config.hmacKey).update(new Buffer(objectString, 'utf-8')).digest('hex').toUpperCase();

                return new Promise(function(resolve, reject) {
                    request.post({
                        headers: {
                            "accept": "application/json",
                            "hash": hash,
                            "content-type": "application/json; charset=utf-8",
                            "api-version": "4"
                        },
                        url: additionalPaymentApiUrl,
                        agentOptions: config.certificatePath ? {
                            cert: config.certificatePath,
                            key: config.keyPath
                        } : null,
                        json: true,
                        body: payload
                    }, function (error, response, body) {
                        try {
                            if (error) {
                                console.log(`Error submitting to casebook: ${error}`);
                                resolve(response.statusCode)
                            } else if (response.statusCode === 200) {
                                console.log(`Application ${additionalPayment.application_id} has been submitted successfully`);
                                resolve(response.statusCode)
                            } else {
                                console.log(`Error processing application ${additionalPayment.application_id} error: ${error} return status: ${response.statusCode}`);
                                resolve(response.statusCode)
                            }
                        } catch (error) {
                            console.log(error)
                            reject(error)
                        }
                    })
                })

            } catch (error) {
                console.log(error)
            }
        }

        async function submitToOrbit(additionalPayment, payload) {
            try {
                const edmsAdditionalPaymentUrl = config.edmsHost + '/api/v1/paymentCapture';
                const edmsBearerToken = await getEdmsAccessToken();
                const startTime = new Date();

                return new Promise(function (resolve, reject) {
                    request.post(
                        {
                            headers: {
                                'content-type': 'application/json',
                                Authorization: `Bearer ${edmsBearerToken}`,
                            },
                            url: edmsAdditionalPaymentUrl,
                            json: true,
                            body: payload,
                        },
                        function (error, response, body) {
                            try {
                                const endTime = new Date();
                                const elapsedTime = endTime - startTime;

                                if (error) {
                                    console.log(`Error submitting to ORBIT: ${error}`);
                                    console.log(`Response Time: ${elapsedTime}ms`); // Log the response time
                                    resolve(response.statusCode);
                                } else if (response.statusCode === 200) {
                                    console.log(
                                        `Application ${additionalPayment.application_id} has been submitted to ORBIT successfully`
                                    );
                                    console.log(`Orbit payment capture request response time: ${elapsedTime}ms`);
                                    resolve(response.statusCode);
                                } else {
                                    console.log(
                                        `Error processing ORBIT application ${additionalPayment.application_id} error: ${error} return status: ${response.statusCode}`
                                    );
                                    console.log(`Orbit payment capture request response time: ${elapsedTime}ms`);
                                    resolve(response.statusCode);
                                }
                            } catch (error) {
                                console.log(error);
                                reject(error);
                            }
                        }
                    );
                });
            } catch (error) {
                console.log(error);
            }
        }

        async function markPaymentAsSubmitted(additionalPayment, responseStatusCode) {
            try {
                return await AdditionalPaymentDetails.update({
                    submitted: 'submitted',
                    submission_attempts: additionalPayment.submission_attempts + 1,
                    casebook_response_code: responseStatusCode,
                    updated_at: moment().format('DD MMMM YYYY, h:mm:ss A')
                }, {
                    where: {
                        application_id: additionalPayment.application_id
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }

        async function getSubmissionAttempts(additionalPayment) {
            try {
                return await AdditionalPaymentDetails.findOne({
                    attributes: ["submission_attempts"],
                    where: {
                        application_id: additionalPayment.application_id
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }

        async function markPaymentAsFailed(additionalPayment, retryAttempts, responseStatusCode) {
            try {
                return await AdditionalPaymentDetails.update({
                    submitted: 'failed',
                    submission_attempts: retryAttempts,
                    casebook_response_code: responseStatusCode,
                    updated_at: moment().format('DD MMMM YYYY, h:mm:ss A')
                }, {
                    where: {
                        application_id: additionalPayment.application_id
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }

        async function updateSubmissionAttempts(additionalPayment, retryAttempts, responseStatusCode) {
            try {
                return await AdditionalPaymentDetails.update({
                    submission_attempts: retryAttempts,
                    casebook_response_code: responseStatusCode,
                    updated_at: moment().format('DD MMMM YYYY, h:mm:ss A')
                }, {
                    where: {
                        application_id: additionalPayment.application_id
                    }
                })
            } catch (error) {
                console.log(error)
            }
        }
    }
}

module.exports = checkForAdditionalPayments;
