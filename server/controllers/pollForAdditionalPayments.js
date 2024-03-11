const axios = require('axios');
const crypto = require('crypto');
const config = require('../config/config');
const AdditionalPaymentDetails = require('../models/index').AdditionalPaymentDetails
const Application = require('../models/index').Application
const moment = require('moment');
const maxRetryAttempts = config.maxRetryAttempts;
const { Op } = require("sequelize");
const {getEdmsAccessToken} = require("../services/HelperService");
const {Agent} = require("https");
const {sequelize} = require("../models");

var checkForAdditionalPayments = {
    checkForAdditionalPayments: async function() {
        try {

            let results = await checkForEligibleAdditionalPayments()

            if (results) {
                const { application_id } = results.dataValues;
                const submissionDestination = await getSubmissionDestination(application_id);

                if (submissionDestination) {
                    const { submission_destination } = submissionDestination.dataValues;
                    await processMessage(results.dataValues, submission_destination);
                } else {
                    await updateAdditionalPaymentStatusToDraft(application_id);
                }
            }

        } catch (error) {
            console.error(error)
        }

        async function checkForEligibleAdditionalPayments() {
            try {
                return await AdditionalPaymentDetails.findOne({
                    where: {
                        submitted: 'queued',
                        submission_attempts: {
                            [Op.lte]: maxRetryAttempts
                        },
                    },
                    order: sequelize.random(),
                })
            } catch (error) {
                console.error(error)
            }
        }

        async function updateAdditionalPaymentStatusToDraft(application_id) {
            try {
                return await AdditionalPaymentDetails.update({
                    submitted: 'draft',
                    updated_at: moment().format('DD MMMM YYYY, h:mm:ss A')
                }, {
                    where: {
                        application_id: application_id
                    }
                })
            } catch (error) {
                console.error(error)
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
                console.error(error)
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
                console.error(error)
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
                console.error(error)
            }
        }

        async function submitToCasebook(additionalPayment, payload) {
            const controller = new AbortController();

            try {
                const signal = controller.signal;
                const additionalPaymentApiUrl = config.additionalPaymentApiUrl;
                const objectString = JSON.stringify(payload);
                const hash = crypto.createHmac('sha512', config.hmacKey).update(Buffer.from(objectString, 'utf-8')).digest('hex').toUpperCase();

                const httpsAgent = new Agent({
                    rejectUnauthorized: true,
                    cert: config.certificatePath,
                    key: config.keyPath
                })

                const response = await axios.post(additionalPaymentApiUrl, payload, {
                    headers: {
                        "accept": "application/json",
                        "hash": hash,
                        "content-type": "application/json; charset=utf-8",
                        "api-version": "4"
                    },
                    httpsAgent,
                    timeout: 5000,
                    signal
                });

                if (response && response.status === 200) {
                    console.log(`Additional payment for ${additionalPayment.application_id} has been submitted successfully`);
                    return response.status;
                } else {
                    console.error(`Failed to submit additional payment for ${additionalPayment.application_id}. Status code: ${response.status || 500}`);
                    controller.abort();
                    return response.status ? response.status : 500;
                }


            } catch (error) {
                controller.abort();
                console.error(`Error submitting additional payment to casebook: ${error}`);
                return error.response ? error.response.status : 500;
            }
        }

        async function submitToOrbit(additionalPayment, payload) {
            const controller = new AbortController();

            try {
                const signal = controller.signal;
                const edmsAdditionalPaymentUrl = config.edmsHost + '/api/v1/paymentCapture';
                const edmsBearerToken = await getEdmsAccessToken();
                const startTime = new Date();

                const response = await axios.post(edmsAdditionalPaymentUrl, payload, {
                    headers: {
                        'content-type': 'application/json',
                        Authorization: `Bearer ${edmsBearerToken}`,
                    },
                    timeout: 9000,
                    signal
                });

                const endTime = new Date();
                const elapsedTime = endTime - startTime;

                if (response && response.status === 200) {
                    console.log(
                        `Additional payment for ${additionalPayment.application_id} has been submitted to ORBIT successfully`
                    );
                    console.log(`Orbit payment capture request response time: ${elapsedTime}ms`);
                    return response.status;
                } else {
                    console.error(`Failed to submit additional payment for ${additionalPayment.application_id}. Status code: ${response.status || 500}`);
                    controller.abort();
                    return response.status ? response.status : 500;
                }

            } catch (error) {
                console.error(`Error submitting additional payment to ORBIT: ${error}`);
                return error.response ? error.response.status : 500;
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
                console.error(error)
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
                console.error(error)
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
                console.error(error)
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
                console.error(error)
            }
        }
    }
}

module.exports = checkForAdditionalPayments;
