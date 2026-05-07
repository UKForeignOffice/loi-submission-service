import axios from 'axios'
import { Op } from 'sequelize'
import { config } from '../config/config.js'
import { logger } from '../config/logs.js'
import { AdditionalPaymentDetails, sequelize } from '../models/index.js'
import { HelperService } from '../services/HelperService.js'

const maxRetryAttempts = config.maxRetryAttempts

const formatDate = (dateTimeNow) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(dateTimeNow)

export const checkForAdditionalPayments = async () => {
  try {
    const results = await checkForEligibleAdditionalPayments()
    if (results) await processMessage(results.dataValues)
  } catch (error) {
    logger.error(error)
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
      logger.error(error)
    }
  }

  async function processMessage(additionalPayment) {
    try {
      logger.info(`Processing ${additionalPayment.application_id}`)

      if (!additionalPayment.submission_request) await generatePayload(additionalPayment)

      const { submission_request } = await getSubmissionPayload(additionalPayment)
      const response = await submitToOrbit(additionalPayment, submission_request)

      if (response === 200) {
        await markPaymentAsSubmitted(additionalPayment, response)
      } else {
        const currentSubmissionAttempts = await getSubmissionAttempts(additionalPayment)
        const retryAttempts = currentSubmissionAttempts.submission_attempts + 1

        logger.info(`maxRetryAttempts: ${maxRetryAttempts}`)
        logger.info(`retryAttempts: ${retryAttempts}`)

        if (retryAttempts >= maxRetryAttempts) {
          logger.info(`Retry Attempt limit reached`)
          await markPaymentAsFailed(additionalPayment, retryAttempts, response)
        } else {
          await updateSubmissionAttempts(additionalPayment, retryAttempts, response)
        }
      }
    } catch (error) {
      logger.error(error)
    }
  }

  async function generatePayload(additionalPayment) {
    try {
      const payload = {
        payment: {
          timestamp: Date.now().toString(),
          userId: 'legalisation',
          applicationReference: additionalPayment.application_id,
          reference: additionalPayment.payment_reference,
          amount: additionalPayment.payment_amount,
          gateway: 'GOV_PAY',
        },
      }
      await updateSubmissionPayload(additionalPayment, payload)
    } catch (error) {
      logger.error(error)
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
      logger.error(error)
    }
  }

  async function submitToOrbit(additionalPayment, payload) {
    const controller = new AbortController()

    try {
      const signal = controller.signal
      const edmsAdditionalPaymentUrl = `${config.edmsHost}/api/v1/paymentCapture`
      const edmsBearerToken = await HelperService.getEdmsAccessToken()
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
        logger.info(
          `Additional payment for ${additionalPayment.application_id} has been submitted to ORBIT successfully`,
        )
        logger.info(`Orbit payment capture request response time: ${elapsedTime}ms`)
        return response.status
      } else {
        logger.error(
          `Failed to submit additional payment for ${additionalPayment.application_id}. Status code: ${response.status || 500}`,
        )
        controller.abort()
        return response.status ? response.status : 500
      }
    } catch (error) {
      logger.error(`Error submitting additional payment to ORBIT: ${error}`)
      return error.response ? error.response.status : 500
    }
  }

  async function updateSubmissionPayload(additionalPayment, payload) {
    try {
      return await AdditionalPaymentDetails.update(
        {
          submission_request: payload,
          updated_at: formatDate(Date.now()),
        },
        {
          where: {
            application_id: additionalPayment.application_id,
          },
        },
      )
    } catch (error) {
      logger.error(error)
    }
  }

  async function markPaymentAsSubmitted(additionalPayment, responseStatusCode) {
    try {
      return await AdditionalPaymentDetails.update(
        {
          submitted: 'submitted',
          submission_attempts: additionalPayment.submission_attempts + 1,
          submission_response_code: responseStatusCode,
          updated_at: formatDate(Date.now()),
        },
        {
          where: {
            application_id: additionalPayment.application_id,
          },
        },
      )
    } catch (error) {
      logger.error(error)
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
      logger.error(error)
    }
  }

  async function markPaymentAsFailed(additionalPayment, retryAttempts, responseStatusCode) {
    try {
      return await AdditionalPaymentDetails.update(
        {
          submitted: 'failed',
          submission_attempts: retryAttempts,
          submission_response_code: responseStatusCode,
          updated_at: formatDate(Date.now()),
        },
        {
          where: {
            application_id: additionalPayment.application_id,
          },
        },
      )
    } catch (error) {
      logger.error(error)
    }
  }

  async function updateSubmissionAttempts(additionalPayment, retryAttempts, responseStatusCode) {
    try {
      return await AdditionalPaymentDetails.update(
        {
          submission_attempts: retryAttempts,
          submission_response_code: responseStatusCode,
          updated_at: formatDate(Date.now()),
        },
        {
          where: {
            application_id: additionalPayment.application_id,
          },
        },
      )
    } catch (error) {
      logger.error(error)
    }
  }
}
