import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { checkForAdditionalPaymentsController } from '../server/controllers/pollForAdditionalPaymentsController.js'
import { AdditionalPaymentDetails } from '../server/models/index.js'

describe('pollForAdditionalPayments flow', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('submits a queued additional payment successfully and marks it submitted', async () => {
    const paymentRecord = {
      application_id: 'APP-42',
      payment_reference: 'PAY-1',
      payment_amount: 55.5,
      submission_attempts: 2,
      submission_request: null,
    }

    const findOneStub = vi.spyOn(AdditionalPaymentDetails, 'findOne')
    findOneStub.mockResolvedValueOnce({ dataValues: paymentRecord })
    findOneStub.mockResolvedValueOnce({ submission_request: { payment: { reference: 'PAY-1' } } })
    const updateStub = vi.spyOn(AdditionalPaymentDetails, 'update').mockResolvedValue([1])
    const postStub = vi.spyOn(axios, 'post').mockResolvedValue({ status: 200 })

    await checkForAdditionalPaymentsController.checkForAdditionalPayments()

    expect(postStub).toHaveBeenCalledOnce()
    expect(updateStub).toHaveBeenCalledTimes(2)
    expect(updateStub.mock.calls[0][0]).toHaveProperty('submission_request')
    expect(updateStub.mock.calls[0][0]).toHaveProperty('updated_at')
    expect(updateStub.mock.calls[1][0]).toMatchObject({
      submitted: 'submitted',
      submission_attempts: 3,
      submission_response_code: 200,
    })
  })
})
