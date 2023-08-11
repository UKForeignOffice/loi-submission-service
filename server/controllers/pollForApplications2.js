const crypto = require('crypto');
const axios = require('axios');
const config = require('../config/config');
const ExportedApplicationData = require('../models/index').ExportedApplicationData
const Application = require('../models/index').Application
const SubmissionAttempts = require('../models/index').SubmissionAttempts
const ExportedEAppData = require('../models/index').ExportedEAppData
const UploadedDocumentUrls = require('../models/index').UploadedDocumentUrls
const maxRetryAttempts = parseInt(config.maxRetryAttempts);
const { Op } = require("sequelize");
const { sequelize } = require("../models");
const {getEdmsAccessToken} = require("../services/HelperService");
const {Agent} = require("https");

async function checkForApplications() {
    try {
        const results = await checkForEligibleApplications();
        if (results) {
            const {application_id, submissionAttempts, serviceType, submission_destination} = results;
            await processApplication(application_id, submissionAttempts, serviceType, submission_destination);
        }
    } catch (error) {
        console.error(`checkForApplications: ${error}`);
    }
}

async function checkForEligibleApplications() {
    try {
        return await Application.findOne({
            where: {
                submitted: 'queued',
                submissionAttempts: {
                    [Op.lt]: maxRetryAttempts,
                },
            },
            order: sequelize.random(),
        });
    } catch (error) {
        console.error(`checkForEligibleApplications: ${error}`);
    }
}

async function processApplication(application_id, submission_attempts, service_type, submission_destination) {
    try {
        const isOrbit = submission_destination === 'ORBIT';
        const isEApp = service_type === 4;
        await updateApplicationAsProcessing(application_id, isEApp);
        if (isEApp) {
            const eAppData = await getEAppData(application_id);
            if (!eAppData) {
                console.log(`No exported app data found for ${application_id}`);
                await updateApplicationAsFailed(application_id);
            } else {
                const eAppDocumentUrls = await getEAppDocumentUrls(application_id)
                const applicationJsonObject = await generateEAppObject(
                    eAppData,
                    eAppDocumentUrls
                );
                if (isOrbit) await postToOrbit(applicationJsonObject, application_id, submission_attempts);
                if (!isOrbit ) await postToCasebook(applicationJsonObject, application_id, submission_attempts);
            }
        } else if (!isEApp) {
            let appData = await getAppData(application_id)
            if (!appData) {
                console.log(`No exported app data found for ${application_id}`);
                await updateApplicationAsFailed(application_id);
            } else {
                const applicationJsonObject = await generateApplicationObject(appData)
                if (isOrbit) await postToOrbit(applicationJsonObject, application_id, submission_attempts);
                if (!isOrbit ) await postToCasebook(applicationJsonObject, application_id, submission_attempts);
            }
        }
    } catch (error) {
        console.error(`processApplication: ${error}`);
    }
}

async function getEAppData(application_id) {
    try {
        return await ExportedEAppData.findOne({
            where: {
                application_id: application_id
            },
        });
    } catch (error) {
        console.error(`getEAppData: ${error}`);
    }
}

async function getAppData(application_id) {
    try {
        return await ExportedApplicationData.findOne({
            where: {
                application_id: application_id
            },
        });
    } catch (error) {
        console.error(`getAppData: ${error}`);
    }
}

async function getEAppDocumentUrls(application_id) {
    try {
        return await UploadedDocumentUrls.findAll({
            where: {
                application_id: application_id
            },
        });
    } catch (error) {
        console.error(`getEAppDocumentUrls: ${error}`);
    }
}

async function updateApplicationAsProcessing(application_id, isEApp) {
    console.log(`Processing ${application_id}${isEApp ? ' (eApp)' : ' (paper)'}`);
    try {
        return await Application.update({
            submitted: 'processing'
        }, {
            where: {
                application_id: application_id
            }
        });
    } catch (error) {
        console.error(`updateApplicationAsProcessing: ${error}`);
    }
}

async function updateApplicationAsFailed(application_id) {
    console.log(`Marking ${application_id} as failed`)
    try {
        return await Application.update({
            submitted: 'failed'
        }, {
            where: {
                application_id: application_id
            }
        });
    } catch (error) {
        console.error(`updateApplicationAsFailed: ${error}`);
    }
}

async function placeBackInTheQueue(application_id, submission_attempts) {
    console.log(`Updating ${application_id} submission attempts (${submission_attempts}/${maxRetryAttempts})`)
    try {
        return await Application.update({
            submissionAttempts: submission_attempts,
            submitted: 'queued'
        }, {
            where: {
                application_id: application_id
            }
        });
    } catch (error) {
        console.error(`placeBackInTheQueue: ${error}`);
    }
}

async function updateApplicationAsSubmitted(application_id, response, submission_attempts) {
    console.log(`Marking ${application_id} as submitted`)
    try {
        return await Application.update({
            submitted: 'submitted',
            application_reference: (response.data.contactId) ? response.data.contactId : response.data.applicationReference,
            case_reference: (response.data.caseId) ? response.data.caseId : response.data.caseReference,
            submissionAttempts: submission_attempts
        }, {
            where: {
                application_id: application_id
            }
        });
    } catch (error) {
        console.error(`updateApplicationAsSubmitted: ${error}`);
    }
}

async function generateEAppObject(eAppData, eAppDocumentUrls) {
    try {
        return {
            legalisationApplication: {
                userId: 'legalisation',
                caseType: 'eApostille Service',
                timestamp: new Date().getTime().toString(),
                applicant: {
                    forenames: eAppData.first_name?.trim(),
                    surname: eAppData.last_name?.trim(),
                    primaryTelephone: eAppData.telephone?.trim(),
                    mobileTelephone: eAppData.mobileNo || '',
                    eveningTelephone: '',
                    email: eAppData.email,
                },
                fields: {
                    applicationReference: eAppData.unique_app_id,
                    documentCount: eAppData.doc_count,
                    paymentReference: eAppData.payment_reference,
                    paymentGateway: 'GOV_PAY',
                    paymentAmount: eAppData.payment_amount,
                    customerInternalReference: eAppData.user_ref?.trim(),
                    feedbackConsent: eAppData.feedback_consent,
                    companyName: eAppData.company_name,
                    companyRegistrationNumber: '',
                    portalCustomerId: eAppData.user_id,
                    additionalInformation: '',
                },
                documents: await generateDocumentArray(eAppDocumentUrls),
            },
        }
    } catch (error) {
        console.error(`generateEAppObject: ${error}`);
    }
}

async function generateDocumentArray(eAppDocumentUrls) {
    try {
        return eAppDocumentUrls.map((document) => ({
            name: document.filename,
            downloadUrl: document.uploaded_url,
        }));
    } catch (error) {
        console.error(`generateDocumentArray: ${error}`);
    }
}

async function postToOrbit(applicationJsonObject, application_id, submission_attempts) {
    const controller = new AbortController();
    const signal = controller.signal;

    const edmsSubmissionApiUrl = config.edmsHost + '/api/v1/submitApplication';
    const edmsBearerToken = await getEdmsAccessToken();
    const this_submission_attempt = submission_attempts + 1
    try {
        if (!edmsBearerToken) throw new Error('Error fetching access token')
        const response = await axios.post(edmsSubmissionApiUrl, applicationJsonObject, {
            headers: {
                'content-type': 'application/json',
                'Authorization': `Bearer ${edmsBearerToken}`
            },
            timeout: 5000,
            signal
        });
        if (response && response.status === 200) {
            await updateApplicationAsSubmitted(application_id, response, this_submission_attempt)
            await logSubmissionAttempt(application_id, this_submission_attempt, applicationJsonObject, 'submitted', response.status, response.data)
        } else {
            controller.abort();
            await placeBackInTheQueue(application_id, this_submission_attempt)
            await logSubmissionAttempt(application_id, this_submission_attempt, applicationJsonObject, 'failed', response.status, response.data)
            if (submission_attempts === maxRetryAttempts) {
                await updateApplicationAsFailed(application_id)
            }
        }
    } catch (error) {
        controller.abort();
        console.error(`postToOrbit: ${error}`);
        await placeBackInTheQueue(application_id, this_submission_attempt)
        await logSubmissionAttempt(application_id, this_submission_attempt, applicationJsonObject, 'failed', null, null)
        if (this_submission_attempt === maxRetryAttempts) {
            await updateApplicationAsFailed(application_id)
        }
    }
}

async function postToCasebook(applicationJsonObject, application_id, submission_attempts) {
    const controller = new AbortController();
    const signal = controller.signal;

    const submissionApiUrl = config.submissionApiUrl;
    const objectString = JSON.stringify(applicationJsonObject, null, 0);
    const this_submission_attempt = submission_attempts + 1
    const hash = crypto
        .createHmac('sha512', config.hmacKey)
        .update(Buffer.from(objectString, 'utf-8'))
        .digest('hex')
        .toUpperCase();
    try {
        const httpsAgent = new Agent({
            rejectUnauthorized: true,
            cert: config.certificatePath,
            key: config.keyPath
        })
        const response = await axios.post(submissionApiUrl, applicationJsonObject, {
            headers: {
                accept: 'application/json',
                hash,
                'content-type': 'application/json; charset=utf-8',
                'api-version': '4',
            },
            httpsAgent,
            timeout: 5000,
            signal
        });
        if (response && response.status === 200) {
            await updateApplicationAsSubmitted(application_id, response, this_submission_attempt)
            await logSubmissionAttempt(application_id, this_submission_attempt, applicationJsonObject, 'submitted', response.status, response.data)
        } else {
            controller.abort();
            await placeBackInTheQueue(application_id, this_submission_attempt)
            await logSubmissionAttempt(application_id, this_submission_attempt, applicationJsonObject, 'failed', response.status, response.data)
            if (submission_attempts === maxRetryAttempts) {
                await updateApplicationAsFailed(application_id)
            }
        }
    } catch (error) {
        controller.abort();
        console.error(`postToCasebook: ${error}`);
        await placeBackInTheQueue(application_id, this_submission_attempt)
        await logSubmissionAttempt(application_id, this_submission_attempt, applicationJsonObject, 'failed', null, null)
        if (this_submission_attempt === maxRetryAttempts) {
            await updateApplicationAsFailed(application_id)
        }
    }
}

async function logSubmissionAttempt(application_id, retry_number, submitted_json, status, response_status_code, response_body){try {
    return SubmissionAttempts.create({
        application_id: application_id,
        retry_number: retry_number || 0,
        submitted_json: submitted_json,
        status:  status,
        response_status_code: response_status_code,
        response_body: JSON.stringify(response_body)
    })
} catch (error) {
    console.error(`logSubmissionAttempt: ${error}`);
}}

function trimWhitespace(input) {
    if (typeof input === "string") {
        return input.trim();
    }
    if (input === null || input === undefined) {
        return "";
    }
    return input;
}

async function generateApplicationObject(results) {
    let altFullName;
    let altStreet;
    let altTown;
    let altCounty;
    let altCountry;
    let altPostcode;
    let altTelephone;
    let altMobileNo;
    let altEmail;

    const casebookJSON = {
        main: {
            companyName: results.main_organisation !== 'N/A' && results.main_organisation !== null && results.main_organisation !== " " ? results.main_organisation : "",
            flatNumber: "",
            premises: "",
            houseNumber: "",
            postcode: results.postcode
        },
        alt: {
            companyName: "",
            flatNumber: "",
            premises: "",
            houseNumber: "",
            postcode: ""
        }
    };

    updateCaseBookJSON('main', trimWhitespace(results.main_house_name));

    // if there is no alternate address, copy the details from the main address
    if (results.alt_full_name) {
        altFullName = results.alt_full_name;
        altStreet = results.alt_street;
        altTown = results.alt_town;
        altCounty = results.alt_county;
        altCountry = results.alt_country;
        altPostcode = results.alt_postcode;
        altTelephone = results.alt_telephone;
        altMobileNo = results.alt_mobileNo;
        altEmail = results.alt_email;
        casebookJSON.postcode = results.alt_postcode;
        casebookJSON.alt.companyName = results.alt_organisation && results.alt_organisation !== 'N/A' && results.alt_organisation.length !== 0 && results.alt_organisation !== " " ? results.alt_organisation : "";
        updateCaseBookJSON('alt', trimWhitespace(results.alt_house_name));
    } else {
        altFullName = results.main_full_name;
        casebookJSON.alt.companyName = casebookJSON.main.companyName;
        updateCaseBookJSON('alt', trimWhitespace(results.main_house_name));
        altStreet = results.main_street;
        altTown = results.main_town;
        altCounty = results.main_county;
        altCountry = results.main_country;
        altPostcode = results.main_postcode;
        altTelephone = results.main_telephone;
        altMobileNo = results.main_mobileNo;
        altEmail = results.main_email;
    }

    function updateCaseBookJSON(type, house) {
        const isNumeric = require("isnumeric");
        const house_name = house.toString().split(" ");
        const apartments = house.indexOf('Apartments');
        const flats = house.indexOf('Flat');

        if (
            house_name[0] &&
            house_name[1] &&
            house_name[0].toLowerCase() === "flat" &&
            isNumeric(house_name[1].replace(',', '').substr(1, isNumeric(house_name[1].replace(',', '').length)))
        ) {
            casebookJSON[type].flatNumber = house_name[1].replace(',', '');

            if (isNumeric(house_name[house_name.length - 1].replace("-", "").replace(',', ''))) {
                casebookJSON[type].houseNumber = house_name[house_name.length - 1].replace(',', '');
                casebookJSON[type].premises = house.substr(casebookJSON[type].flatNumber.length + 7, house.toString().length - (casebookJSON[type].flatNumber.length + 7) - (casebookJSON[type].houseNumber.length + 1));
            } else {
                casebookJSON[type].premises = house.substr(house_name[0].length + house_name[1].length + 1, house.length).replace(',', '');
            }
        } else if (isNumeric(house_name[house_name.length - 1].replace("-", ""))) {
            casebookJSON[type].houseNumber = house_name[house_name.length - 1];
            if (apartments != -1 || flats !== -1) {
                const subBuilding = house.substr(0, house.length - house_name[house_name.length - 1].length).replace(',', '');
                if (subBuilding.split(" ")[0].toLowerCase() === "flat") {
                    casebookJSON[type].flatNumber = subBuilding.split(" ")[1];
                    casebookJSON[type].premises = subBuilding.substr(subBuilding.split(" ")[0].length + subBuilding.split(" ")[1].length + 2, subBuilding.length - 1).replace(',', '');
                } else {
                    casebookJSON[type].flatNumber = subBuilding.split(" ")[0];
                    casebookJSON[type].premises = subBuilding.substr(subBuilding.split(" ")[0].length, subBuilding.length - 1).replace(',', '');
                }
            } else {
                casebookJSON[type].premises = house.substr(0, house.length - house_name[house_name.length - 1].length).replace(',', '');
            }
        } else if (house_name[0] && house_name[1] && house_name[0].toLowerCase() === "flat" && isNumeric(house_name[1].replace(',', ''))) {
            casebookJSON[type].flatNumber = house_name[1].replace(',', '');
            casebookJSON[type].premises = house.substr(house_name[0].length + house_name[1].length + 1, house.length).replace(',', '');
        } else if (isNumeric(house_name[0].split(/[A-Za-z]/)[0])) {
            casebookJSON[type].houseNumber = house_name[0];
            casebookJSON[type].premises = house.substr(house_name[0].length + 1, house.length).replace(',', '');
        } else if (isNumeric(house_name[0].replace("-", ""))) {
            casebookJSON[type].houseNumber = house_name[0].replace(',', '');
            casebookJSON[type].premises = house.substr(house_name[0].length + 1, house.length).replace(',', '');
        } else if (isNumeric(house_name[0].replace(",", ""))) {
            casebookJSON[type].houseNumber = house_name[0].replace(',', '');
            casebookJSON[type].premises = house.substr(house_name[0].length + 1, house.length - house_name[0].length + 1).replace(',', '');
        } else if (house.length > 10) {
            casebookJSON[type].premises = house.replace(',', '');
        } else {
            casebookJSON[type].premises = house;
        }

        // Catch all fixes
        if (casebookJSON[type].houseNumber.length > 10) {
            casebookJSON[type].premises = casebookJSON[type].houseNumber + casebookJSON[type].premises;
            casebookJSON[type].houseNumber = "";
        }
        if (casebookJSON[type].flatNumber.length > 10) {
            casebookJSON[type].premises = 'Flat ' + casebookJSON[type].flatNumber + casebookJSON[type].premises;
            casebookJSON[type].flatNumber = "";
        }
    }

    let obj;

    if (results.applicationType === "Postal Service") {
        obj = {
            legalisationApplication: {
                userId: "legalisation",
                caseType: results.applicationType,
                timestamp: (new Date()).getTime().toString(),
                applicant: {
                    forenames: trimWhitespace(results.first_name),
                    surname: trimWhitespace(results.last_name),
                    primaryTelephone: trimWhitespace(results.telephone),
                    mobileTelephone: trimWhitespace(results.mobileNo),
                    eveningTelephone: "",
                    email: trimWhitespace(results.email)
                },
                fields: {
                    applicationReference: results.unique_app_id,
                    postalType: results.postage_return_title,
                    documentCount: results.doc_count,
                    paymentReference: results.payment_reference,
                    paymentAmount: results.payment_amount,
                    paymentGateway: 'GOV_PAY',
                    customerInternalReference: trimWhitespace(results.user_ref),
                    feedbackConsent: trimWhitespace(results.feedback_consent),
                    companyName: results.company_name !== 'N/A' ? results.company_name : "",
                    companyRegistrationNumber: "",
                    portalCustomerId: results.user_id === 0 ? "" : results.user_id,
                    successfulReturnDetails: {
                        fullName: trimWhitespace(results.main_full_name),
                        address: {
                            companyName: casebookJSON.main.companyName,
                            flatNumber: casebookJSON.main.flatNumber || "",
                            premises: casebookJSON.main.premises || "",
                            houseNumber: casebookJSON.main.houseNumber || "",
                            street: trimWhitespace(results.main_street),
                            district: "",
                            town: trimWhitespace(results.main_town) || "",
                            region: trimWhitespace(results.main_county) || "",
                            postcode: trimWhitespace(results.main_postcode),
                            country: trimWhitespace(results.main_country || 'United Kingdom')
                        },
                        telephone: trimWhitespace(results.main_telephone || ""),
                        mobileNo: trimWhitespace(results.main_mobileNo || ""),
                        email: trimWhitespace(results.main_email || "")
                    },
                    unsuccessfulReturnDetails: {
                        fullName: altFullName,
                        address: {
                            companyName: casebookJSON.alt.companyName,
                            flatNumber: casebookJSON.alt.flatNumber || "",
                            premises: casebookJSON.alt.premises || "",
                            houseNumber: casebookJSON.alt.houseNumber || "",
                            street: trimWhitespace(altStreet) || "",
                            district: "",
                            town: trimWhitespace(altTown) || "",
                            region: trimWhitespace(altCounty),
                            postcode: trimWhitespace(altPostcode),
                            country: trimWhitespace(altCountry || 'United Kingdom')
                        },
                        telephone: trimWhitespace(altTelephone || ""),
                        mobileNo: trimWhitespace(altMobileNo || ""),
                        email: trimWhitespace(altEmail || "")
                    },
                    additionalInformation: ""
                }
            }
        };
    } else {
        obj = {
            legalisationApplication: {
                userId: "legalisation",
                caseType: results.applicationType,
                timestamp: (new Date()).getTime().toString(),
                applicant: {
                    forenames: trimWhitespace(results.first_name),
                    surname: trimWhitespace(results.last_name),
                    primaryTelephone: trimWhitespace(results.telephone),
                    mobileTelephone: trimWhitespace(results.mobileNo),
                    eveningTelephone: "",
                    email: trimWhitespace(results.email)
                },
                fields: {
                    applicationReference: results.unique_app_id,
                    postalType: results.postage_return_title,
                    documentCount: results.doc_count,
                    paymentReference: results.payment_reference,
                    paymentAmount: results.payment_amount,
                    paymentGateway: 'GOV_PAY',
                    customerInternalReference: trimWhitespace(results.user_ref),
                    feedbackConsent: trimWhitespace(results.feedback_consent),
                    companyName: results.company_name !== 'N/A' ? results.company_name : "",
                    companyRegistrationNumber: "",
                    portalCustomerId: results.user_id === 0 ? "" : results.user_id,
                    additionalInformation: ""
                }
            }
        };
    }

    return obj;
}


module.exports = {
    checkForApplications,
    checkForEligibleApplications,
    updateApplicationAsProcessing,
    placeBackInTheQueue
};