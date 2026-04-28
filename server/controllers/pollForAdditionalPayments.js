const axios = require('axios')
const config = require('../config/config')
const AdditionalPaymentDetails = require('../models/index').AdditionalPaymentDetails
const moment = require('moment')
const maxRetryAttempts = config.maxRetryAttempts
const { Op } = require('sequelize')
const { getEdmsAccessToken } = require('../services/HelperService')
const { sequelize } = require('../models')

const checkForAdditionalPayments = {
  checkForAdditionalPayments: async function () {
    try {
      const results = await checkForEligibleAdditionalPayments()
      if (results) await processMessage(results.dataValues)
    } catch (error) {
      console.error(error)
    }

    async function checkForEligibleAdditionalPayments() {
      try {
        return await AdditionalPaymentDetails.findOne({
          where: {
            submitted: 'queued',
            submission_attempts: {
              [Op.lte]: maxRetryAttempts,
            },
          },
          order: sequelize.random(),
        })
      } catch (error) {
        console.error(error)
      }
    }

    async function processMessage(additionalPayment) {
      try {
        console.log(`Processing ${additionalPayment.application_id}`)

        if (!additionalPayment.submission_request) await generatePayload(additionalPayment)

        const { submission_request } = await getSubmissionPayload(additionalPayment)
        const response = await submitToOrbit(additionalPayment, submission_request)

        if (response === 200) {
          await markPaymentAsSubmitted(additionalPayment, response)
        } else {
          let currentSubmissionAttempts = await getSubmissionAttempts(additionalPayment)
          let retryAttempts = currentSubmissionAttempts.submission_attempts + 1

          console.log(`maxRetryAttempts: ${maxRetryAttempts}`)
          console.log(`retryAttempts: ${retryAttempts}`)

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
        const payload = {
          payment: {
            timestamp: new Date().getTime().toString(),
            userId: 'legalisation',
            applicationReference: additionalPayment.application_id,
            reference: additionalPayment.payment_reference,
            amount: additionalPayment.payment_amount,
            gateway: 'GOV_PAY',
          },
        }
        await updateSubmissionPayload(additionalPayment, payload)
      } catch (error) {
        console.error(error)
      }
    }

    async function getSubmissionPayload(additionalPayment) {
      try {
        return await AdditionalPaymentDetails.findOne({
          attributes: ['submission_request'],
          where: {
            application_id: additionalPayment.application_id,
          },
        })
      } catch (error) {
        console.error(error)
      }
    }

    async function submitToOrbit(additionalPayment, payload) {
      const controller = new AbortController()

      try {
        const signal = controller.signal
        const edmsAdditionalPaymentUrl = config.edmsHost + '/api/v1/paymentCapture'
        const edmsBearerToken = await getEdmsAccessToken()
        const startTime = new Date()

        const response = await axios.post(edmsAdditionalPaymentUrl, payload, {
          headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${edmsBearerToken}`,
          },
          timeout: 9000,
          signal,
        })

        const endTime = new Date()
        const elapsedTime = endTime - startTime

        if (response && response.status === 200) {
          console.log(
            `Additional payment for ${additionalPayment.application_id} has been submitted to ORBIT successfully`,
          )
          console.log(`Orbit payment capture request response time: ${elapsedTime}ms`)
          return response.status
        } else {
          console.error(
            `Failed to submit additional payment for ${additionalPayment.application_id}. Status code: ${response.status || 500}`,
          )
          controller.abort()
          return response.status ? response.status : 500
        }
      } catch (error) {
        console.error(`Error submitting additional payment to ORBIT: ${error}`)
        return error.response ? error.response.status : 500
      }
    }

    async function updateSubmissionPayload(additionalPayment, payload) {
      try {
        return await AdditionalPaymentDetails.update(
          {
            submission_request: payload,
            updated_at: moment().format('DD MMMM YYYY, h:mm:ss A'),
          },
          {
            where: {
              application_id: additionalPayment.application_id,
            },
          },
        )
      } catch (error) {
        console.error(error)
      }
    }

    async function markPaymentAsSubmitted(additionalPayment, responseStatusCode) {
      try {
        return await AdditionalPaymentDetails.update(
          {
            submitted: 'submitted',
            submission_attempts: additionalPayment.submission_attempts + 1,
            submission_response_code: responseStatusCode,
            updated_at: moment().format('DD MMMM YYYY, h:mm:ss A'),
          },
          {
            where: {
              application_id: additionalPayment.application_id,
            },
          },
        )
      } catch (error) {
        console.error(error)
      }
    }

    async function getSubmissionAttempts(additionalPayment) {
      try {
        return await AdditionalPaymentDetails.findOne({
          attributes: ['submission_attempts'],
          where: {
            application_id: additionalPayment.application_id,
          },
        })
      } catch (error) {
        console.error(error)
      }
    }

    async function markPaymentAsFailed(additionalPayment, retryAttempts, responseStatusCode) {
      try {
        return await AdditionalPaymentDetails.update(
          {
            submitted: 'failed',
            submission_attempts: retryAttempts,
            submission_response_code: responseStatusCode,
            updated_at: moment().format('DD MMMM YYYY, h:mm:ss A'),
          },
          {
            where: {
              application_id: additionalPayment.application_id,
            },
          },
        )
      } catch (error) {
        console.error(error)
      }
    }

    async function updateSubmissionAttempts(additionalPayment, retryAttempts, responseStatusCode) {
      try {
        return await AdditionalPaymentDetails.update(
          {
            submission_attempts: retryAttempts,
            submission_response_code: responseStatusCode,
            updated_at: moment().format('DD MMMM YYYY, h:mm:ss A'),
          },
          {
            where: {
              application_id: additionalPayment.application_id,
            },
          },
        )
      } catch (error) {
        console.error(error)
      }
    }
  },
}

module.exports = checkForAdditionalPayments
